import os
import logging
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Check OCR availability gracefully
OCR_AVAILABLE = False
try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True
except ImportError:
    logger.warning("pytesseract or pdf2image not installed. OCR fallback disabled.")


def extract_text_and_pages(pdf_path: str) -> List[Tuple[int, str]]:
    """
    Extracts text page by page from a PDF file.
    If a page has virtually no text (less than 20 characters),
    attempts OCR fallback via pytesseract if available.
    Returns a list of (page_number_1_indexed, text).
    """
    pages_data: List[Tuple[int, str]] = []
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)

    scanned_pages_indices = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        text = page.extract_text() or ""
        cleaned_text = text.strip()

        if len(cleaned_text) < 20:
            scanned_pages_indices.append(idx)
            pages_data.append((page_num, cleaned_text))
        else:
            pages_data.append((page_num, cleaned_text))

    # If any pages were deemed empty/scanned and OCR is available, run single-page OCR fallback safely
    if scanned_pages_indices and OCR_AVAILABLE:
        # Cap OCR attempts to first 5 low-text pages to prevent timeouts on low-CPU cloud instances
        target_indices = scanned_pages_indices[:5]
        logger.info(f"Attempting low-memory single-page OCR on {len(target_indices)} pages...")
        for idx in target_indices:
            try:
                # Convert ONLY the single target page to prevent 512MB RAM exhaustion
                images = convert_from_path(pdf_path, first_page=idx + 1, last_page=idx + 1)
                if images:
                    ocr_text = pytesseract.image_to_string(images[0]).strip()
                    if ocr_text:
                        pages_data[idx] = (idx + 1, ocr_text)
                        logger.info(f"OCR successfully extracted text from Page {idx + 1}")
                    del images
            except Exception as ocr_err:
                logger.warning(f"Single-page OCR failed on page {idx + 1}: {ocr_err}")

    return pages_data


def chunk_document(
    pages_data: List[Tuple[int, str]],
    source_filename: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[Document]:
    """
    Splits page-level text into overlapping chunks,
    preserving exact page metadata for citation tracking.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    documents: List[Document] = []
    chunk_counter = 0

    for page_num, text in pages_data:
        if not text.strip():
            continue

        raw_chunks = splitter.split_text(text)
        for chunk in raw_chunks:
            chunk_clean = chunk.strip()
            if not chunk_clean:
                continue

            doc = Document(
                page_content=chunk_clean,
                metadata={
                    "source": source_filename,
                    "page": page_num,
                    "chunk_id": chunk_counter,
                },
            )
            documents.append(doc)
            chunk_counter += 1

    return documents


def process_pdf_file(
    file_path: str,
    source_filename: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> Tuple[List[Document], int]:
    """
    Top-level helper to parse and chunk a PDF file.
    Returns (chunks, total_pages).
    """
    pages_data = extract_text_and_pages(file_path)
    total_pages = len(pages_data)
    chunks = chunk_document(
        pages_data=pages_data,
        source_filename=source_filename,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return chunks, total_pages
