import secrets
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.llmService import get_llm_response, query_metrics_with_llm

logger = logging.getLogger(__name__)
router = APIRouter()


class QueryRequest(BaseModel):
    prompt: str


class QueryResponse(BaseModel):
    response: str


class NLQueryRequest(BaseModel):
    prompt: str


def _verify_internal_auth(
    x_internal_service_key: str | None,
    x_client_id: str | None,
) -> str:
    """
    Validates the shared internal service secret and extracts the client ID
    from request headers. Called before executing any /nl-query request.

    Returns the verified client_id string.
    Raises HTTP 401 on any auth failure.
    """
    # --- 1. Shared-secret check -------------------------------------------------
    if not x_internal_service_key:
        logger.warning("[queryRoutes] /nl-query rejected: X-Internal-Service-Key missing")
        raise HTTPException(status_code=401, detail="Missing internal service key")

    # Use secrets.compare_digest to prevent timing-attack leakage
    if not secrets.compare_digest(x_internal_service_key, settings.INTERNAL_SERVICE_KEY):
        logger.warning("[queryRoutes] /nl-query rejected: X-Internal-Service-Key mismatch")
        raise HTTPException(status_code=401, detail="Invalid internal service key")

    # --- 2. Client ID check -----------------------------------------------------
    if not x_client_id or not x_client_id.strip():
        logger.warning("[queryRoutes] /nl-query rejected: X-Client-Id header missing or empty")
        raise HTTPException(status_code=401, detail="Missing X-Client-Id header")

    return x_client_id.strip()


@router.post("/query", response_model=QueryResponse)
async def query_llm(request: QueryRequest) -> QueryResponse:
    try:
        result = get_llm_response(request.prompt)
        return QueryResponse(response=result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate LLM response: {str(e)}"
        ) from e


@router.post("/nl-query", response_model=QueryResponse)
async def nl_query(
    request: NLQueryRequest,
    x_internal_service_key: str | None = Header(default=None),
    x_client_id: str | None = Header(default=None),
) -> QueryResponse:
    """
    Natural-language metrics query endpoint.

    Headers required (set by the Node backend after its own auth middleware):
      X-Internal-Service-Key : shared secret matching INTERNAL_SERVICE_KEY in .env
      X-Client-Id            : the verified client UUID of the authenticated user
    """
    client_id = _verify_internal_auth(x_internal_service_key, x_client_id)

    try:
        result = query_metrics_with_llm(
            user_prompt=request.prompt,
            client_id=client_id,
        )
        return QueryResponse(response=result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"NL query failed: {str(e)}"
        ) from e


@router.get("/db-test")
async def test_db_connection() -> dict:
    conn = None
    try:
        from app.db import get_db_connection

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        return {"db_status": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database test failed: {str(e)}"
        ) from e
    finally:
        if conn:
            conn.close()
