from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    process_type: str = Field(max_length=50)

    business_date: date

    status: str = Field(default="QUEUED", max_length=20)

    priority: int = Field(default=0)

    trigger_type: str = Field(default="MANUAL", max_length=20)

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    started_at: datetime | None = None

    finished_at: datetime | None = None

    error: str | None = None
