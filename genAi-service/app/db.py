import psycopg2
from app.config import settings


def get_db_connection():
    """
    Creates and returns a new psycopg2 database connection to PostgreSQL
    using settings.DATABASE_URL. Strips Prisma-specific ?schema= parameter.
    """
    try:
        db_url = settings.DATABASE_URL
        # Strip Prisma-specific query parameter (?schema=public) for psycopg2
        if "?schema=" in db_url:
            db_url = db_url.split("?schema=")[0]
        elif "&schema=" in db_url:
            db_url = db_url.split("&schema=")[0]

        conn = psycopg2.connect(db_url)
        return conn
    except psycopg2.Error as e:
        raise RuntimeError(f"Database connection failure: {str(e)}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected database connection error: {str(e)}") from e
