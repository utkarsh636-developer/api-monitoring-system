from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llmService import get_llm_response

router = APIRouter()


class QueryRequest(BaseModel):
    prompt: str


class QueryResponse(BaseModel):
    response: str


@router.post("/query", response_model=QueryResponse)
async def query_llm(request: QueryRequest) -> QueryResponse:
    try:
        result = get_llm_response(request.prompt)
        return QueryResponse(response=result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate LLM response: {str(e)}"
        ) from e
