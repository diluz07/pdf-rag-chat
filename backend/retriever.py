import os
import logging
from typing import List, Tuple, Dict, Any
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Base persistence directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")
FASTEMBED_CACHE_DIR = os.path.join(BASE_DIR, "fastembed_cache")

os.makedirs(CHROMA_DIR, exist_ok=True)
os.makedirs(FASTEMBED_CACHE_DIR, exist_ok=True)

# Singleton embeddings instance
_embeddings_instance = None


def get_embeddings() -> FastEmbedEmbeddings:
    global _embeddings_instance
    if _embeddings_instance is None:
        logger.info("Initializing FastEmbed BAAI/bge-small-en-v1.5 embeddings...")
        _embeddings_instance = FastEmbedEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
        )
    return _embeddings_instance


def get_collection_name(doc_id: str) -> str:
    # Chroma requires collection names between 3-63 characters, alphanumeric, underscores or hyphens
    sanitized = doc_id.replace("-", "_")
    return f"doc_{sanitized}"[:63]


def get_vector_store(doc_id: str) -> Chroma:
    embeddings = get_embeddings()
    collection_name = get_collection_name(doc_id)
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
        collection_metadata={"hnsw:space": "cosine"},
    )


def store_chunks(doc_id: str, chunks: List[Document]) -> int:
    """
    Stores a list of chunk Documents into a dedicated ChromaDB collection for the document.
    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    vector_store = get_vector_store(doc_id)
    import gc
    batch_size = 32
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        vector_store.add_documents(documents=batch)
        gc.collect()
    
    logger.info(f"Stored {len(chunks)} chunks in collection {get_collection_name(doc_id)}")
    return len(chunks)


def retrieve_relevant_chunks(
    doc_id: str,
    query: str,
    top_k: int = 5,
) -> List[Tuple[Document, float]]:
    """
    Performs cosine similarity search with relevance scores.
    Returns a list of (Document, relevance_score) sorted by highest relevance.
    """
    vector_store = get_vector_store(doc_id)
    try:
        # LangChain Chroma returns scores (cosine similarity when hnsw:space is cosine)
        results = vector_store.similarity_search_with_relevance_scores(query, k=top_k)
        return results
    except Exception as e:
        logger.warning(f"Error during similarity_search_with_relevance_scores: {e}. Falling back to similarity_search_with_score.")
        results_with_score = vector_store.similarity_search_with_score(query, k=top_k)
        # Convert distance to approximate similarity score
        converted = []
        for doc, dist in results_with_score:
            sim = 1.0 - (dist / 2.0)
            converted.append((doc, max(0.0, min(1.0, sim))))
        return converted


def delete_document_index(doc_id: str) -> bool:
    """
    Deletes the vector store collection for a document when expired or cleaned up.
    """
    try:
        vector_store = get_vector_store(doc_id)
        vector_store.delete_collection()
        logger.info(f"Deleted collection for doc_id {doc_id}")
        return True
    except Exception as e:
        logger.warning(f"Failed to delete collection for doc_id {doc_id}: {e}")
        return False
