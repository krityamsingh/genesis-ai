# tests/conftest.py
# GENESIS — Pytest configuration and shared fixtures
# UPGRADED 2026-04: mongomock-motor for async MongoDB mocking

from __future__ import annotations

import asyncio
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Use test MongoDB URL
os.environ.setdefault("MONGO_URL",     "mongodb://localhost:27017")
os.environ.setdefault("MONGO_DB_NAME", "genesis_test")
os.environ.setdefault("JWT_SECRET",    "test-secret-key-do-not-use-in-production")
os.environ.setdefault("ENV",           "test")
os.environ.setdefault("HF_TOKEN",      "hf_test_token_placeholder")


# ── Pytest settings ───────────────────────────────────────────────────────────

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: mark test as slow-running")
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "unit: mark test as unit test")


# ── Event loop ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Mock GemmaEngine ──────────────────────────────────────────────────────────

@pytest.fixture
def mock_gemma_engine():
    """A fully-mocked GemmaEngine that doesn't call HuggingFace."""
    engine = MagicMock()
    engine.model_id                     = "google/gemma-4-27b-it"
    engine.think.return_value           = "This is a mock AI response."
    engine.think_async                  = AsyncMock(return_value="This is a mock async AI response.")
    engine.think_json.return_value      = '{"result": "mock", "confidence": 0.9}'
    engine.think_json_async             = AsyncMock(return_value='{"result": "mock async"}')
    engine.think_stream.return_value    = iter(["Mock ", "stream ", "response."])
    engine.think_stream_async           = AsyncMock()
    engine.code.return_value            = "def mock_function():\n    return 'mock'"
    engine.see.return_value             = "This image shows a mock object."
    engine.think_batch.return_value     = ["answer1", "answer2", "answer3"]
    engine.think_batch_async            = AsyncMock(return_value=["a1", "a2", "a3"])
    return engine


# ── Mock Router ───────────────────────────────────────────────────────────────

@pytest.fixture
def mock_router(mock_gemma_engine):
    """A Router with mock engine and a single mock m1 module."""
    with patch("core.gemma_engine.InferenceClient"), \
         patch("core.gemma_engine.AsyncInferenceClient"):
        from core.router import Router
        m1 = MagicMock(return_value={"response": "mock m1 answer"})
        return Router(engine=mock_gemma_engine, modules={"m1": m1})


# ── FastAPI test client ───────────────────────────────────────────────────────

@pytest.fixture
def test_client(mock_gemma_engine):
    """HTTPX AsyncClient pointed at the GENESIS FastAPI app."""
    from httpx import AsyncClient, ASGITransport
    with patch("api.dependencies.get_engine", return_value=mock_gemma_engine), \
         patch("database.mongo.connect_db",    new_callable=AsyncMock), \
         patch("database.mongo.close_db",      new_callable=AsyncMock):
        from api.main import create_app
        app    = create_app()
        client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        return client


# ── Sample data helpers ───────────────────────────────────────────────────────

@pytest.fixture
def sample_user_data():
    return {
        "username": "testuser",
        "email":    "test@example.com",
        "password": "Test@12345!",
    }


@pytest.fixture
def sample_conversation_data():
    return {
        "title":  "Test conversation",
        "module": "m1",
    }


@pytest.fixture
def sample_message_data():
    return {
        "content": "What is self-attention?",
        "role":    "user",
    }


@pytest.fixture
def admin_headers():
    """Pre-built auth headers for admin requests in integration tests."""
    import jwt, datetime
    token = jwt.encode(
        {
            "sub":      "admin@genesis.ai",
            "is_admin": True,
            "jti":      "test-jti-admin",
            "exp":      datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        },
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers():
    """Pre-built auth headers for regular user requests in integration tests."""
    import jwt, datetime
    token = jwt.encode(
        {
            "sub":      "test@example.com",
            "is_admin": False,
            "jti":      "test-jti-user",
            "exp":      datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        },
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
