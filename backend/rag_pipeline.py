import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)

NOT_FOUND_MESSAGE = "I couldn't find that in the uploaded document."
DEFAULT_SIMILARITY_THRESHOLD = 0.35

SYSTEM_GROUNDING_PROMPT = """You are an articulate, highly knowledgeable document Q&A assistant.
Your goal is to provide rich, comprehensive, and thoroughly explanatory answers to user questions using EXCLUSIVELY the provided Document Context chunks below.

CORE PRINCIPLES:
1. Comprehensive & Complete Coverage:
   - Thoroughly cover everything the document says regarding the user's question. Include all relevant details, components, figures, conditions, background, and related facts found in the context.
   - Do not give truncated or superficial one-sentence summaries when richer details and context are available in the text.

2. Structured, Clean Formatting:
   - Structure your answer cleanly using standard Markdown:
     * Use bold text (**important term**) to emphasize key concepts, terminology, and definitions.
     * Use bulleted lists (- Item) or numbered steps with clean line breaks for distinct items, components, or steps.
     * Use concise subheadings (### Section) for multi-part or detailed answers.
     * Maintain clear paragraph breaks for readability.

3. Humanized & Natural Voice (NO Verbatim Copy-Pasting):
   - Explain and synthesize the concepts in your own fluent, natural, engaging human voice.
   - Do NOT simply copy-paste raw sentences or robotic excerpts from the PDF. Rephrase, clarify, and articulate the concepts smoothly as a human domain expert would when explaining to a colleague.
   - Avoid robotic AI preambles (e.g., do NOT start with "Based on the provided context...", "According to the document...", or "The text indicates..."). Dive straight into the explanation.

4. Strict Document Grounding & Citations:
   - Every claim must remain 100% faithful to the facts stated in the Document Context. Never extrapolate, hallucinate, or bring in outside world knowledge.
   - Clearly cite the specific page number(s) where each fact originates using [Page X] format naturally within or at the end of key points.

5. Missing Information:
   - If the Document Context does not contain sufficient information to answer the question, respond with EXACTLY:
   "{not_found_message}"
   Do not apologize, speculate, or suggest external possibilities."""


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
    4. Strict grounding prompt enforcement and source citations
    """
    history = history or []

    # 1. Edge Case: No chunks retrieved
    if not chunks_with_scores:
        return {
            "answer": NOT_FOUND_MESSAGE,
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
            "answer": NOT_FOUND_MESSAGE,
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
    formatted_system = SYSTEM_GROUNDING_PROMPT.format(not_found_message=NOT_FOUND_MESSAGE)

    user_prompt = f"""Document Context:
{context_str}

User Question: {question}

Instructions for your response:
1. Deliver a comprehensive, well-rounded explanation that captures all relevant facts, details, numbers, and nuances from the context.
2. Explain everything in your own natural, humanized words rather than copying sentences verbatim from the PDF.
3. Integrate [Page X] citations naturally where facts are mentioned.
4. If the document truly does not contain information to answer the question, reply with '{NOT_FOUND_MESSAGE}'."""

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
        clean_ans.lower() == NOT_FOUND_MESSAGE.lower()
        or NOT_FOUND_MESSAGE.lower() in clean_ans.lower()
    )

    return {
        "answer": NOT_FOUND_MESSAGE if is_not_found else clean_ans,
        "sources": [] if is_not_found else sources_data,
        "grounded": not is_not_found,
        "provider": used_provider,
        "gated": False,
    }
