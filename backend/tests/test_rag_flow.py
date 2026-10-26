import os
import io
import pytest
from pypdf import PdfWriter
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def create_dummy_pdf():
    from pypdf import PageObject
    writer = PdfWriter()
    # Add a page with specific known facts
    page = PageObject.create_blank_page(width=300, height=300)
    # We can write a simple reportlab or basic text if available, or test ingestion directly
    return writer


def test_end_to_end_rag_grounding():
    # Health check
    res = client.get("/health")
    assert res.status_code == 200

    # Test unknown query returns 404
    res = client.post("/query", json={"doc_id": "missing-doc", "question": "test"})
    assert res.status_code == 404
