from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llmService import get_llm_response, query_metrics_with_llm

router = APIRouter()


class QueryRequest(BaseModel):
    prompt: str


class QueryResponse(BaseModel):
    response: str


class NLQueryRequest(BaseModel):
    prompt: str
    client_id: str


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
async def nl_query(request: NLQueryRequest) -> QueryResponse:
    try:
        result = query_metrics_with_llm(
            user_prompt=request.prompt,
            client_id=request.client_id,
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
