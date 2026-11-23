from uuid import UUID

from sqlmodel import Field, SQLModel


class TaskResource(SQLModel, table=True):
    __tablename__ = "task_resources"

    task_id: UUID = Field(
        foreign_key="tasks.id",
        primary_key=True,
    )

    resource_key: str = Field(
        primary_key=True,
        max_length=255,
    )
