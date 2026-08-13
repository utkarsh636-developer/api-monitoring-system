from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def get_llm_response(prompt: str) -> str:
    """
    Initializes Gemini model and returns the clean text response for a given prompt.
    """
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )

        response = llm.invoke(prompt)
        return str(response.text)

    except Exception as e:
        raise RuntimeError(f"LLM service call failed: {str(e)}") from e
