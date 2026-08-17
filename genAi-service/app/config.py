import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip()
        self.INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "").strip()

        if not self.GEMINI_API_KEY and not self.ANTHROPIC_API_KEY:
            raise ValueError(
                "CRITICAL: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set! "
                "Please set GEMINI_API_KEY in your .env file."
            )

        if not self.DATABASE_URL:
            raise ValueError(
                "CRITICAL: DATABASE_URL is missing! "
                "Please set DATABASE_URL in your .env file."
            )

        if not self.INTERNAL_SERVICE_KEY:
            raise ValueError(
                "CRITICAL: INTERNAL_SERVICE_KEY is missing! "
                "Generate a random secret and set it in your .env file."
            )


settings = Settings()
