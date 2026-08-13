import os
import sys

# Ensure root directory (genAi-service) is in sys.path when running script directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def main() -> None:
    print("--- Initializing ChatGoogleGenerativeAI Model ---")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )

        prompt = "Say hello and confirm you're working, in one sentence."
        print(f"Sending prompt: '{prompt}'\n")

        response = llm.invoke(prompt)

        print("--- Response Received ---")
        if isinstance(response.content, list):
            clean_text = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in response.content
            )
        else:
            clean_text = str(response.content)

        print(clean_text)

    except Exception as e:
        error_type = type(e).__name__
        if "Auth" in error_type or "401" in str(e) or "API_KEY" in str(e):
            print(f"\n[AUTHENTICATION ERROR]: Invalid or missing Gemini API key.")
            print(f"Details: {e}")
        else:
            print(f"\n[{error_type}]: Failed to invoke Gemini model.")
            print(f"Details: {e}")


if __name__ == "__main__":
    main()
