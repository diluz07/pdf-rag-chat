import os
import logging
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Ensure common macOS Homebrew paths are in PATH
for p in ["/opt/homebrew/bin", "/usr/local/bin"]:
    if p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{p}:{os.environ.get('PATH', '')}"

# Check OCR availability gracefully
OCR_AVAILABLE = False
try:
    import pytesseract
    from pdf2image import convert_from_path
    from PIL import Image, ImageOps
    # Check if tesseract binary can be found
    import shutil
    if shutil.which("tesseract"):
        OCR_AVAILABLE = True
        logger.info("OCR tools detected (pytesseract & tesseract binary ready).")
    else:
        logger.warning("pytesseract installed but 'tesseract' binary not found in PATH.")
except ImportError:
    logger.warning("pytesseract or pdf2image not installed. OCR fallback disabled.")


def extract_text_from_image(image_path: str) -> str:
    """
    Extracts text directly from an image file (.png, .jpg, iPhone photos, etc.) using OCR.
    """
    if not OCR_AVAILABLE:
        raise RuntimeError(
            "Tesseract OCR is not installed or available. Please install tesseract to process image files."
        )
    try:
        with Image.open(image_path) as raw_img:
            # 1. Correct orientation from EXIF (essential for phone camera photos)
            transposed = ImageOps.exif_transpose(raw_img)
            img = transposed if transposed is not None else raw_img

            # 2. Convert to standard RGB image and set format explicitly to PNG
            # This handles MPO (iPhone camera files), RGBA, WebP, CMYK without pytesseract format errors
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode in ("RGBA", "LA") and "A" in img.getbands():
                rgb_img.paste(img, (0, 0), img.getchannel("A"))
            else:
                rgb_img.paste(img.convert("RGB"), (0, 0))
            rgb_img.format = "PNG"

            text = pytesseract.image_to_string(rgb_img)
            return text.strip()
    except Exception as e:
        logger.error(f"Failed to OCR image {image_path}: {e}")
        raise RuntimeError(f"OCR processing failed on image: {e}")


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
        import gc
        max_ocr_pages = 25  # Guard against memory spikes on free tier
        ocr_candidates = scanned_pages_indices[:max_ocr_pages]
        logger.info(f"Attempting low-memory OCR on {len(ocr_candidates)} scanned/low-text page(s)...")
        for idx in ocr_candidates:
            try:
                # Convert ONLY the single target page with 120 DPI (sharp for OCR, 75% less RAM)
                images = convert_from_path(
                    pdf_path,
                    first_page=idx + 1,
                    last_page=idx + 1,
                    dpi=120,
                    fmt="jpeg",
                    thread_count=1,
                )
                if images:
                    ocr_text = pytesseract.image_to_string(images[0]).strip()
                    if ocr_text:
                        pages_data[idx] = (idx + 1, ocr_text)
                        logger.info(f"OCR successfully extracted text from Page {idx + 1}")
                    del images
                    gc.collect()
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


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}


def process_document_file(
    file_path: str,
    source_filename: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> Tuple[List[Document], int]:
    """
    Top-level helper to parse and chunk a PDF or image file.
    Returns (chunks, total_pages).
    """
    ext = os.path.splitext(source_filename.lower())[1]
    if ext in IMAGE_EXTENSIONS:
        text = extract_text_from_image(file_path)
        pages_data = [(1, text)]
        total_pages = 1
    else:
        pages_data = extract_text_and_pages(file_path)
        total_pages = len(pages_data)

    chunks = chunk_document(
        pages_data=pages_data,
        source_filename=source_filename,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return chunks, total_pages


# Backward compatibility alias
process_pdf_file = process_document_file

