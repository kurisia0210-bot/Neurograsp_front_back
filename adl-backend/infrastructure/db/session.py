from .config import DATABASE_URL


def get_db_url() -> str:
    return DATABASE_URL
