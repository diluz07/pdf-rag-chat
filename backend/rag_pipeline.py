import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)

NOT_FOUND_MESSAGE = "I took a look through the document, but I couldn't find any mention of that. If you'd like to ask about other topics covered in the file, feel free to ask!"
DEFAULT_SIMILARITY_THRESHOLD = 0.35

SYSTEM_GROUNDING_PROMPT = """You are a helpful, knowledgeable reading companion discussing an uploaded document.
Your goal is to answer the user's questions clearly, naturally, and accurately based on the provided Document Context.

CORE PRINCIPLES (HUMAN & NATURAL VOICE):
1. Talk Like a Real Person, Not an AI:
   - Speak in a natural, warm, and conversational tone, like a smart colleague talking through notes.
   - Strictly avoid AI clichés, corporate buzzwords, and promotional fluff: NEVER use words like "delve", "tapestry", "landscape", "testament", "pivotal", "foster", "leverage", "moreover", "furthermore", "in conclusion", or "it is important to note".
   - Skip robotic AI openings (e.g., do NOT start with "Based on the provided document...", "According to the context...", or "Certainly!"). Jump right into the explanation.
   - Let formatting feel natural: write in clean, readable paragraphs. Don't over-bold every keyword, and only use bullet points when genuinely breaking down distinct items, steps, or numbered questions.

2. Faithful Grounding & Natural Citations:
   - Every fact, concept, and answer must come directly from the Document Context. Never hallucinate, extrapolate, or introduce outside world knowledge.
   - Include the page citation naturally near the fact or question (e.g. "[Page 2]" or "[p. 4]").

3. Handling Question Generation, Quizzes, and Synthesis:
   - When the user asks to generate questions, quizzes, study guides, summaries, or discussion points (e.g., "give me 5 questions about [topic]", "what can I ask about this?", "generate a quiz"):
     * Do NOT look for an already-existing list of questions in the document.
     * Directly generate relevant, thoughtful questions based on the key concepts, facts, mechanisms, and topics explained in the Document Context.
     * Tag each generated question with the page number where that topic is discussed (e.g., "[Page X]").

4. When the Topic is Truly Not in the Document:
   - If the Document Context does NOT contain information about the requested topic at all, you MUST start your response with the exact tag: [NOT_FOUND]
   - After the tag, explain politely and naturally in a human way that the topic is not covered in the document (for example: "[NOT_FOUND] I took a look through the material you shared, and it doesn't talk about that topic at all. If you have any other questions about the content in the document, just let me know!").
   - In this case, DO NOT cite any page numbers or include any citations. Do NOT give cold, repetitive canned sentences."""



# Multi-model Groq pool for automatic failover when rate limits are reached
GROQ_MODELS_POOL = [
    os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]


def get_groq_llm(model_name: str):
    """Initializes a specific Groq model client."""
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key.startswith("your_"):
        return None

    try:
        from langchain_groq import ChatGroq
        return ChatGroq(
            groq_api_key=groq_api_key,
            model_name=model_name,
            temperature=0.2,
            max_retries=1,
            timeout=18,
        )
    except Exception as e:
        logger.warning(f"Could not initialize ChatGroq ({model_name}): {e}")
        return None


def get_primary_llm():
    """Returns the primary Groq model for backward compatibility."""
    preferred = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    return get_groq_llm(preferred)


def get_llm():
    """Returns primary LLM for backward compatibility."""
    llm = get_primary_llm()
    if llm:
        return llm, "groq"
    return None, "none"


def invoke_llm_cascade(messages: list) -> Tuple[Optional[str], str]:
    """
    Executes an LLM prompt across multiple Groq models:
    Iterates through multiple Groq models (bypassing model-specific rate limits).
    Returns: (generated_text, provider_and_model_identifier)
    """
    # Deduplicate Groq models
    seen_groq = set()
    groq_models = []
    for m in GROQ_MODELS_POOL:
        if m and m not in seen_groq:
            seen_groq.add(m)
            groq_models.append(m)

    for model in groq_models:
        llm = get_groq_llm(model)
        if not llm:
            continue
        try:
            logger.info(f"Attempting generation with Groq model: {model}...")
            response = llm.invoke(messages)
            text = response.content.strip()
            if text:
                logger.info(f"Successfully generated response with Groq ({model})")
                return text, f"groq:{model}"
        except Exception as err:
            err_msg = str(err).lower()
            if "429" in err_msg or "rate" in err_msg or "limit" in err_msg or "quota" in err_msg:
                logger.warning(f"Groq rate limit hit on model '{model}' ({err}). Automatically cascading to next Groq model in pool...")
            else:
                logger.warning(f"Groq model '{model}' failed ({err}). Trying next model in pool...")

    logger.error("All Groq models in the cascade pool reached rate limits or failed.")
    return None, "none"


def clean_llm_response(text: str) -> str:
    """Removes annoying conversational preambles like 'Based on the provided context...'"""
    patterns = [
        r"^(According to|Based on|As stated in|From) (the|your) (provided |uploaded )?(document|context|file|text)[,\s:]*",
        r"^(Sure|Certainly)[!,\s]+(here is|according to)[^:]*:\s*",
    ]
    cleaned = text.strip()
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned


def rewrite_question_with_history(
    question: str,
    history: List[Dict[str, str]],
    llm=None,
) -> str:
    """
    If multi-turn history exists, rewrites ambiguous follow-up questions
    into standalone search queries using the multi-model cascade.
    """
    if not history:
        return question

    recent_turns = history[-4:]  # Last 2 exchanges
    history_text = "\n".join(
        [f"{turn.get('role', 'user')}: {turn.get('content', '')}" for turn in recent_turns]
    )

    prompt = f"""Given the following conversation history and a follow-up question, rephrase the follow-up question into an independent standalone question while fully preserving all user requirements, depth, and context.
Do NOT summarize or constrain the question. Do NOT add words like 'concise' or 'brief'. If the question is already clear and standalone, return it exactly as-is.

Chat History:
{history_text}

Follow-up Question: {question}

Standalone Question:"""

    if llm:
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            standalone = response.content.strip().replace('"', "")
            if standalone:
                logger.info(f"Rephrased question: '{question}' -> '{standalone}'")
                return standalone
        except Exception as e:
            logger.warning(f"Provided LLM failed for question rewriting ({e}). Using cascade...")

    generated, _ = invoke_llm_cascade([HumanMessage(content=prompt)])
    if generated:
        standalone = generated.replace('"', "").strip()
        logger.info(f"Rephrased question via cascade: '{question}' -> '{standalone}'")
        return standalone

    return question


def format_context_chunks(chunks_with_scores: List[Tuple[Document, float]]) -> str:
    """Formats retrieved chunks with page metadata into a clear context prompt."""
    formatted_sections = []
    for i, (doc, score) in enumerate(chunks_with_scores, 1):
        page_num = doc.metadata.get("page", "Unknown")
        content = doc.page_content.strip()
        formatted_sections.append(
            f"--- [Document Chunk {i} | Page {page_num} | Relevance: {score:.3f}] ---\n{content}"
        )
    return "\n\n".join(formatted_sections)


def get_humanized_not_found(question: str) -> str:
    cleaned = question.strip().rstrip("?").strip()
    if cleaned:
        return (
            f"I looked through the document, but I couldn't find any mention of \"{cleaned}\". "
            f"If there's another topic or section in the file you'd like to explore, feel free to ask!"
        )
    return (
        "I looked through the document, but I couldn't find any information on that. "
        "Feel free to ask about any other sections or topics covered in the file!"
    )


def check_is_not_found(text: str) -> bool:
    # Normalize unicode apostrophes (e.g. doesn’t -> doesn't) and curly quotes
    normalized = (
        text.replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .lower()
    )
    indicators = [
        "not found",
        "couldn't find",
        "could not find",
        "doesn't talk",
        "does not talk",
        "not talk about",
        "talk about",
        "doesn't mention",
        "does not mention",
        "not mentioned",
        "doesn't contain",
        "does not contain",
        "not contained",
        "doesn't cover",
        "does not cover",
        "not covered",
        "doesn't discuss",
        "does not discuss",
        "not discussed",
        "doesn't include",
        "does not include",
        "not included",
        "doesn't speak",
        "does not speak",
        "doesn't say",
        "does not say",
        "doesn't address",
        "does not address",
        "not addressed",
        "doesn't touch",
        "does not touch",
        "no mention of",
        "no discussion of",
        "no definition",
        "no information about",
        "no information on",
        "not in the document",
        "not in the uploaded",
        "not in the text",
        "not in the material",
        "unable to find",
        "was not able to find",
        "not provide information",
        "doesn't provide",
        "does not provide",
    ]
    return any(ind in normalized for ind in indicators)


def is_conversational_or_greeting(text: str) -> bool:
    """
    Detects if the user input is a greeting, pleasantry, or small talk
    (e.g., 'hi', 'hello', 'hey', 'good morning', 'how are you', 'thank you', 'bye')
    so that we do NOT attach document citations or treat it as a grounded document question.
    """
    if not text:
        return False

    cleaned = re.sub(r"[^\w\s]", " ", text.strip().lower())
    words = cleaned.split()
    if not words:
        return False

    joined = " ".join(words)

    # 1. Exact greetings and pleasantries
    exact_matches = {
        "hi", "hello", "hey", "heya", "howdy", "hola", "yo", "sup",
        "greetings", "good morning", "good afternoon", "good evening",
        "good day", "morning", "afternoon", "evening",
        "how are you", "how are you doing", "how r u", "how is it going",
        "who are you", "what are you", "what can you do", "what do you do",
        "help", "help me", "can you help",
        "thank you", "thanks", "thx", "thank you so much", "thanks a lot",
        "bye", "goodbye", "see you", "see ya", "good night",
        "ok", "okay", "cool", "great", "awesome", "nice", "got it", "understood",
    }
    if joined in exact_matches:
        return True

    # 2. Short greetings (<= 3 words, starting with a common greeting like "hi there", "hello bot")
    if len(words) <= 3 and words[0] in {"hi", "hello", "hey", "heya", "howdy", "hola"}:
        return True

    # 3. Meta inquiries on how to talk to or use the assistant
    meta_inquiries = [
        "how to talk to you", "how do i talk to you", "how can i talk to you",
        "how to talk with you", "how do i talk with you", "how to talk to u",
        "how do i talk to u", "how can i talk to u", "how to talk",
        "how to chat with you", "how do i chat with you", "how to chat",
        "how to use you", "how do i use you", "how can i use you",
        "how to use this", "how do i use this", "how can i use this",
        "how does this work", "how do you work", "how does it work",
        "what can you do", "what do you do", "what can i ask you",
        "what can i ask", "what should i ask you", "what should i ask",
        "how do i ask", "how to ask", "how to ask questions",
        "how do i ask questions", "how can i ask questions",
        "who are you", "what are you", "tell me about yourself",
        "what is your purpose", "how to use pagewise", "how do i use pagewise",
        "how does pagewise work", "help me get started", "getting started",
        "how to communicate", "how to communicate with you",
    ]
    if any(q in joined for q in meta_inquiries):
        return True

    return False


def answer_query(
    question: str,
    chunks_with_scores: List[Tuple[Document, float]],
    history: Optional[List[Dict[str, str]]] = None,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> Dict[str, Any]:
    """
    Main RAG generation logic with:
    1. Similarity threshold gatekeeper
    2. Multi-model Groq cascade with automatic rate limit failover
    3. OpenRouter multi-model fallback
    4. Humanized tone and natural grounding
    """
    history = history or []

    # 0. Conversational / Greeting / Meta-Inquiry Check: respond warmly without document citations
    if is_conversational_or_greeting(question):
        logger.info(f"Detected conversational/greeting/meta query: '{question}'. Responding without citations.")

        is_how_to_use = any(k in question.lower() for k in [
            "how to talk", "how do i talk", "how can i talk", "how to chat",
            "how to use", "how do i use", "how does this work", "how do you work",
            "what can you do", "what can i ask", "what should i ask", "how to ask",
            "who are you", "what are you", "instructions", "getting started", "how to communicate",
        ])

        if is_how_to_use:
            prompt_content = (
                f"The user asked: '{question}'. "
                "You are the PageWise AI document reading companion. "
                "Explain warmly, clearly, and concisely in 2 friendly sentences how they can talk to you and use PageWise: "
                "they can simply type any question in plain English to summarize sections, extract key facts or numbers, "
                "clarify terms, or find specific details, and you will retrieve the answers with exact page citations from their document. "
                "Do NOT include any [Page X] citations or brackets."
            )
        else:
            prompt_content = (
                f"The user said: '{question}'. "
                "You are the PageWise AI document assistant. Respond warmly, politely, and briefly in 1-2 friendly sentences, "
                "welcoming them and letting them know you are ready to answer any questions about their uploaded document. "
                "Do NOT include any page numbers, citations, or brackets."
            )

        generated_text, used_provider = invoke_llm_cascade([
            SystemMessage(content="You are the friendly, helpful PageWise document assistant. Speak naturally like a real person, not an AI."),
            HumanMessage(content=prompt_content),
        ])
        if not generated_text:
            if is_how_to_use:
                generated_text = (
                    "You can talk to me just like a colleague! Ask me any questions in plain English—like summarizing sections, "
                    "extracting key figures, or clarifying concepts—and I'll find the exact answers directly from your document with page citations."
                )
            else:
                generated_text = "Hello! I'm your PageWise document assistant. Ask me anything about your uploaded document, and I'll find the answers for you!"

        return {
            "answer": clean_llm_response(generated_text),
            "sources": [],
            "grounded": False,
            "provider": used_provider,
            "gated": False,
        }

    # 1. Edge Case: No chunks retrieved
    if not chunks_with_scores:
        return {
            "answer": get_humanized_not_found(question),
            "sources": [],
            "grounded": False,
            "provider": "none",
            "gated": True,
        }

    # 2. Similarity threshold gatekeeper
    best_score = max(score for _, score in chunks_with_scores)
    logger.info(f"Query: '{question}' | Best chunk similarity: {best_score:.4f} (Threshold: {similarity_threshold})")

    if best_score < similarity_threshold:
        logger.info(f"Query rejected by similarity gate ({best_score:.4f} < {similarity_threshold})")
        return {
            "answer": get_humanized_not_found(question),
            "sources": [],
            "grounded": False,
            "provider": "gatekeeper",
            "gated": True,
        }

    # Format sources for response
    sources_data = [
        {
            "page": doc.metadata.get("page", 1),
            "content": doc.page_content,
            "score": round(score, 4),
        }
        for doc, score in chunks_with_scores
    ]

    context_str = format_context_chunks(chunks_with_scores)
    formatted_system = SYSTEM_GROUNDING_PROMPT

    user_prompt = f"""Document Context:
{context_str}

User Question: {question}

Instructions for your response:
1. Explain the answer or generate the requested content (such as questions, summaries, key takeaways, or comparisons) clearly and conversationally in your own natural words using the context above.
2. If the user asks for questions, quizzes, or topics to ask, formulate them directly from the concepts and information in the Document Context—do not expect the document to already contain a pre-written question list.
3. Avoid AI clichés (no 'delve', 'testament', 'tapestry', 'furthermore'). Speak like a smart colleague.
4. Integrate [Page X] citations naturally where facts or questions are grounded in the document.
5. Only if the context has NO mention or information about the requested topic, begin your response with '[NOT_FOUND]' on the first line and explain naturally that the document does not cover this topic. DO NOT include any page numbers or [Page X] citations."""

    # 3. Generate answer via Groq multi-model cascade -> OpenRouter fallback
    generated_text, used_provider = invoke_llm_cascade([
        SystemMessage(content=formatted_system),
        HumanMessage(content=user_prompt),
    ])

    if not generated_text:
        return {
            "answer": (
                "All AI models in the pool are currently rate-limited or unavailable. "
                "Here are the most relevant sections retrieved from your document:\n\n"
                + "\n\n".join([f"**[Page {s['page']}]**: {s['content'][:250]}..." for s in sources_data[:2]])
            ),
            "sources": sources_data,
            "grounded": True,
            "provider": "exhausted_fallback",
            "gated": False,
        }

    # 5. Clean and format answer
    clean_ans = clean_llm_response(generated_text)
    is_not_found = (
        "[not_found]" in clean_ans.lower()
        or check_is_not_found(clean_ans)
    )

    if is_not_found:
        # Strip [NOT_FOUND] tag
        clean_ans = re.sub(r'\[NOT_FOUND\]', '', clean_ans, flags=re.IGNORECASE).strip()
        # Strip any accidental page references if the answer was not in the document
        clean_ans = re.sub(r'\[(?:Page|p\.?)\s*\d+\]', '', clean_ans, flags=re.IGNORECASE)
        clean_ans = re.sub(r'\((?:Page|p\.?)\s*\d+\)', '', clean_ans, flags=re.IGNORECASE)
        clean_ans = re.sub(r'\s{2,}', ' ', clean_ans).strip()
        return {
            "answer": clean_ans,
            "sources": [],
            "grounded": False,
            "provider": used_provider,
            "gated": False,
        }

    return {
        "answer": clean_ans,
        "sources": sources_data,
        "grounded": True,
        "provider": used_provider,
        "gated": False,
    }
