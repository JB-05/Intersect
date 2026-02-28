import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_api_root(client: AsyncClient):
    response = await client.get("/api/v1/")
    assert response.status_code == 200
    assert "message" in response.json()
