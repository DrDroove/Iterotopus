from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, text
from sqlmodel import Session, select

from iterotopus.models import ResourceLock, Task, TaskResource


class ResourceConflict(Exception):
    def __init__(self, resource_key: str):
        self.resource_key = resource_key
        super().__init__(f"Resource busy: {resource_key}")


class TaskNotQueued(Exception):
    pass


def get_task_resources(session: Session, task_id: UUID) -> list[str]:
    return list(
        session.exec(
            select(TaskResource.resource_key).where(TaskResource.task_id == task_id)
        ).all()
    )


def try_acquire_resources(
    session: Session,
    task_id: UUID,
) -> bool:
    """
    True  — task RUNNING, resources acquired.
    False — conflict or task unavailable.
    """

    try:
        with session.begin_nested():
            # Блокируем строку задачи
            task = session.exec(
                select(Task.id)
                .where(
                    Task.id == task_id,
                    Task.status == "QUEUED",
                )
                .with_for_update()
            ).first()

            if task is None:
                raise TaskNotQueued()

            # Читаем ресурсы после блокировки задачи
            resource_keys = get_task_resources(
                session,
                task_id,
            )

            now = datetime.now(UTC)

            for key in sorted(resource_keys):
                row = session.execute(
                    text("""
                        INSERT INTO resource_locks
                            (resource_key, task_id, acquired_at)
                        VALUES (:key, :task_id, :now)
                        ON CONFLICT (resource_key) DO NOTHING
                        RETURNING resource_key
                    """),
                    {
                        "key": key,
                        "task_id": task_id.hex,
                        "now": now.isoformat(),
                    },
                ).first()

                if row is None:
                    raise ResourceConflict(key)

            updated = session.execute(
                text("""
                    UPDATE tasks
                    SET status = 'RUNNING', started_at = :now
                    WHERE id = :task_id AND status = 'QUEUED'
                    RETURNING id
                """),
                {
                    "task_id": task_id.hex,
                    "now": now.isoformat(),
                },
            ).first()

            if updated is None:
                raise TaskNotQueued()

        session.commit()
        return True

    except (ResourceConflict, TaskNotQueued):
        session.rollback()
        return False


def release_resources(session: Session, task_id: UUID) -> None:
    session.exec(delete(ResourceLock).where(ResourceLock.task_id == task_id))
    session.commit()
