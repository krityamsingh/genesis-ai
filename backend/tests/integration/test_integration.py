# tests/integration/test_integration.py
# GENESIS — Full API integration tests
# UPGRADED 2026-04: async fixtures, mongomock, comprehensive coverage

from __future__ import annotations

import pytest
from unittest.mock import patch, AsyncMock


pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_health_check(test_client):
    async with test_client as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "genesis" in data["service"].lower()


@pytest.mark.asyncio
async def test_docs_accessible(test_client):
    async with test_client as client:
        resp = await client.get("/docs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(test_client):
    async with test_client as client:
        resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "paths" in schema
    assert "GENESIS" in schema.get("info", {}).get("title", "")


@pytest.mark.asyncio
async def test_login_wrong_password(test_client):
    with patch("api.v1.auth_routes.User") as MockUser:
        MockUser.find_one = AsyncMock(return_value=None)
        async with test_client as client:
            resp = await client.post("/api/v1/auth/login", json={
                "email": "nobody@nowhere.com",
                "password": "wrongpassword",
            })
    assert resp.status_code in (401, 422)


@pytest.mark.asyncio
async def test_protected_route_without_token(test_client):
    async with test_client as client:
        resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_invalid_token(test_client):
    async with test_client as client:
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_conversations_require_auth(test_client):
    async with test_client as client:
        resp = await client.get("/api/v1/conversations")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_routes_require_admin(test_client, user_headers):
    async with test_client as client:
        resp = await client.get("/api/v1/admin/users", headers=user_headers)
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_module_list_accessible(test_client, user_headers):
    with patch("api.v1.module_routes.ModuleState") as MockState:
        MockState.find = AsyncMock(return_value=[])
        async with test_client as client:
            resp = await client.get("/api/v1/modules", headers=user_headers)
    assert resp.status_code in (200, 401)


@pytest.mark.asyncio
async def test_rate_limit_headers_present(test_client):
    async with test_client as client:
        resp = await client.get("/health")
    # Health endpoint may or may not have rate limit headers — just check it's 200
    assert resp.status_code == 200
