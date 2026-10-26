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


def get_primary_llm():
    """Initializes Groq LLM client if configured."""
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key.startswith("your_"):
        return None

    try:
        from langchain_groq import ChatGroq
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        return ChatGroq(
            groq_api_key=groq_api_key,
            model_name=model_name,
            temperature=0.2,
            max_retries=1,
            timeout=18,
        )
    except Exception as e:
        logger.warning(f"Could not initialize ChatGroq: {e}")
        return None


def get_fallback_llm():
    """Initializes OpenRouter LLM client as fallback."""
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not openrouter_api_key or openrouter_api_key.startswith("your_"):
        return None

    try:
        from langchain_openai import ChatOpenAI
        model_name = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free").strip()
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_api_key,
            model=model_name,
            temperature=0.2,
            max_retries=1,
            timeout=20,
        )
    except Exception as e:
        logger.warning(f"Could not initialize OpenRouter fallback: {e}")
        return None


def get_llm():
    """Returns primary LLM (Groq) or fallback LLM (OpenRouter)."""
    llm = get_primary_llm()
    if llm:
        return llm, "groq"
    fallback = get_fallback_llm()
    if fallback:
        return fallback, "openrouter"
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
    llm,
) -> str:
    """
    If multi-turn history exists, rewrites ambiguous follow-up questions
    into standalone search queries.
    """
    if not history or not llm:
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

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        standalone = response.content.strip().replace('"', "")
        if standalone:
            logger.info(f"Rephrased question: '{question}' -> '{standalone}'")
            return standalone
    except Exception as err:
        logger.warning(f"Question rewriter failed: {err}. Using original question.")

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
    2. Primary LLM (Groq) with automatic fallback (OpenRouter)
    3. Strict grounding prompt enforcement
    4. Source citations metadata
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

    # 3. Initialize LLM
    primary_llm, provider_name = get_llm()
    if not primary_llm:
        # If no LLM keys are configured, return grounded context preview
        return {
            "answer": (
                "LLM API key not configured yet. "
                "Here are the most relevant sections found in your document:\n\n"
                + "\n\n".join([f"**[Page {s['page']}]**: {s['content'][:250]}..." for s in sources_data[:2]])
            ),
            "sources": sources_data,
            "grounded": True,
            "provider": "mock",
            "gated": False,
        }

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

    # 4. Generate answer with primary -> fallback handling
    generated_text = ""
    used_provider = provider_name

    try:
        response = primary_llm.invoke([
            SystemMessage(content=formatted_system),
            HumanMessage(content=user_prompt),
        ])
        generated_text = response.content.strip()
    except Exception as primary_err:
        logger.warning(f"Primary LLM ({provider_name}) failed: {primary_err}. Trying fallback...")
        fallback_llm = get_fallback_llm() if provider_name != "openrouter" else None
        if fallback_llm:
            try:
                response = fallback_llm.invoke([
                    SystemMessage(content=formatted_system),
                    HumanMessage(content=user_prompt),
                ])
                generated_text = response.content.strip()
                used_provider = "openrouter-fallback"
            except Exception as fallback_err:
                logger.error(f"Fallback LLM also failed: {fallback_err}")
                return {
                    "answer": "An error occurred while generating the answer. Please check your API keys or try again.",
                    "sources": sources_data,
                    "grounded": False,
                    "provider": "error",
                    "gated": False,
                }
        else:
            return {
                "answer": f"LLM error: {str(primary_err)}. Please verify your API key in backend/.env.",
                "sources": sources_data,
                "grounded": False,
                "provider": "error",
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
