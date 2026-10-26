import os
import io
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data


def test_query_unknown_doc_returns_404():
    response = client.post(
        "/query",
        json={"doc_id": "nonexistent-id", "question": "What is this?"},
    )
    assert response.status_code == 404
    assert "not found or expired" in response.json()["detail"].lower()


def test_upload_invalid_file_extension():
    fake_file = io.BytesIO(b"Hello world, not a pdf")
    response = client.post(
        "/upload",
        files={"file": ("test.txt", fake_file, "text/plain")},
    )
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]
