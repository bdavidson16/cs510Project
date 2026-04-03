import os
import re
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _build_db_url() -> str:
    host = _env("DB_HOST", "localhost")
    port = _env("DB_PORT", "3306")
    user = _env("DB_USER", "root")
    password = _env("DB_PASSWORD", "Rowan1016!")
    dbname = _env("DB_NAME", "vaccine_database")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"


DB_URL = _build_db_url()
TABLE_NAME = _env("DB_TABLE", "cases")

POOL_SIZE = int(_env("DB_POOL_SIZE", "5"))
MAX_OVERFLOW = int(_env("DB_MAX_OVERFLOW", "10"))
ECHO = _env("DB_ECHO", "false").lower() in ("1", "true", "yes", "on")

engine = create_engine(
    DB_URL,
    pool_pre_ping=True,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    echo=ECHO,
)

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _validate_identifier(name: str) -> str:
    if not _IDENTIFIER_RE.fullmatch(name):
        raise ValueError(f"Invalid identifier: {name}")
    return name


def check_db() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


def get_db_connection():
    return engine.connect()


def get_db_engine():
    return engine


def get_table_columns(table: str | None = None) -> list[str]:
    safe_table = _validate_identifier(table or TABLE_NAME)
    query = text(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
        ORDER BY ORDINAL_POSITION
        """
    )
    rows = query_db(query, {"table": safe_table})
    columns = [row[0] for row in rows]
    if not columns:
        raise ValueError(f"Table not found or has no columns: {safe_table}")
    return columns


def query_db(query: str | Any, params: dict[str, Any] | None):
    with engine.connect() as conn:
        result = conn.execute(text(query) if isinstance(query, str) else query, params or {})
        return result.fetchall()


def execute_db(query: str | Any, params: dict[str, Any] | None):
    with engine.begin() as conn:
        conn.execute(text(query) if isinstance(query, str) else query, params or {})


def get_whole_table(table: str | None = None) -> list[dict[str, Any]]:
    safe_table = _validate_identifier(table or TABLE_NAME)
    query = text(f"SELECT * FROM `{safe_table}`")
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row) for row in result.mappings().all()]


def get_filters(table: str | None = None) -> dict[str, list[Any]]:
    safe_table = _validate_identifier(table or TABLE_NAME)
    columns = get_table_columns(safe_table)
    results: dict[str, list[Any]] = {}

    with engine.connect() as conn:
        for col in columns:
            query = text(
                f"""
                SELECT DISTINCT `{col}` AS value
                FROM `{safe_table}`
                WHERE `{col}` IS NOT NULL
                ORDER BY `{col}`
                """
            )
            values = conn.execute(query).scalars().all()
            results[col] = list(values)

    return results


def add_row(table: str | None, row_data: dict[str, Any]) -> dict[str, Any]:
    safe_table = _validate_identifier(table or TABLE_NAME)
    
    if not row_data:
        raise ValueError("Row payload is empty.")
    
    # Checks if row_data.patient_id already exists in the patient_info table, if not then add it to the patient_info table, with NAME, DOB, and SEX
    if "patient_id" in row_data:
        patient_id = row_data["patient_id"]
        existing_patient = check_row_exists(safe_table, {"patient_id": patient_id})
        if not existing_patient:
            execute_db(
                "INSERT INTO patient_info (patient_id) VALUES (:patient_id, :NAME, :DOB, :SEX)",
                {"patient_id": patient_id, "NAME": row_data.get("NAME"), "DOB": row_data.get("DOB"), "SEX": row_data.get("SEX")}
            )
    
    valid_columns = set(get_table_columns(safe_table))
    cleaned_row = {
        _validate_identifier(key): value for key, value in row_data.items() if key in valid_columns
    }

    if not cleaned_row:
        raise ValueError("No valid columns in payload for target table.")

    columns = list(cleaned_row.keys())
    column_sql = ", ".join(f"`{col}`" for col in columns)
    values_sql = ", ".join(f":{col}" for col in columns)
    insert_stmt = text(f"INSERT INTO `{safe_table}` ({column_sql}) VALUES ({values_sql})")

    execute_db(insert_stmt, cleaned_row)
    return cleaned_row

def check_row_exists(table: str | None, row_data: dict[str, Any]) -> bool:
    safe_table = _validate_identifier(table or TABLE_NAME)
    
    if not row_data:
        raise ValueError("Row payload is empty.")
    
    valid_columns = set(get_table_columns(safe_table))
    cleaned_row = {
        _validate_identifier(key): value for key, value in row_data.items() if key in valid_columns
    }

    if not cleaned_row:
        raise ValueError("No valid columns in payload for target table.")

    where_clauses = " AND ".join(f"`{col}` = :{col}" for col in cleaned_row.keys())
    query_stmt = text(f"SELECT 1 FROM `{safe_table}` WHERE {where_clauses} LIMIT 1")

    result = query_db(query_stmt, cleaned_row)
    return bool(result)