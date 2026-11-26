from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Field, SQLModel


class ResourceLock(SQLModel, table=True):
    __tablename__ = "resource_locks"

    resource_key: str = Field(
        primary_key=True,
        max_length=255,
    )

    task_id: UUID = Field(
        foreign_key="tasks.id",
        index=True,
    )

    acquired_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
