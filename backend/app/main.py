from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db import TABLE_NAME, add_row, check_db, get_filters, get_whole_table, check_row_exists as db_check_row_exists

app = FastAPI(title="CS510 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AddRowPayload(BaseModel):
    row: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/db")
def db_check():
    try:
        check_db()
        return {"db": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/table")
def get_default_table():
    try:
        rows = get_whole_table(TABLE_NAME)
        return {"table": TABLE_NAME, "rows": rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/table/{table}")
def get_table(table: str):
    try:
        rows = get_whole_table(table)
        return {"table": table, "rows": rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/table/{table}/filters")
def get_table_filters(table: str):
    try:
        filters = get_filters(table)
        return {"table": table, "filters": filters}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/table/{table}/rows")
def add_table_row(table: str, payload: AddRowPayload):
    try:
        inserted = add_row(table, payload.row)
        return {"status": "ok", "table": table, "row": inserted}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/table/{table}/row")
def check_row_exists(table: str, request: Request):
    try:
        row_data = dict(request.query_params)
        row_data.pop("table", None)
        result = db_check_row_exists(table, row_data)
        return {"table": table, "exists": result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
