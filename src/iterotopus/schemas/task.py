from datetime import date, datetime
from typing import Literal
from uuid import UUID

from sqlmodel import Field, SQLModel


class TaskCreate(SQLModel):
    process_type: str = Field(min_length=1, max_length=50)
    business_date: date
    sources: list[str] = Field(min_length=1)
    trigger_type: Literal["MANUAL", "SCHEDULED"] = "MANUAL"


class TaskRead(SQLModel):
    id: UUID
    process_type: str
    business_date: date
    status: str
    trigger_type: str
    sources: list[str]
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    error: str | None


class TaskUpdate(SQLModel):
    process_type: str | None = Field(default=None, min_length=1, max_length=50)
    business_date: date | None = None
    sources: list[str] | None = Field(default=None, min_length=1)
    trigger_type: Literal["MANUAL", "SCHEDULED"] | None = None
