# iterotopus/resource_manager.py
from datetime import date
from uuid import UUID

from sqlalchemy import delete, text
from sqlmodel import Session, select

from iterotopus.models import ResourceLock, ResourcePolicy, Task


class ResourceConflict(Exception):
    def __init__(self, resource_key: str):
        self.resource_key = resource_key
        super().__init__(f"Resource busy: {resource_key}")


class TaskNotQueued(Exception):
    pass


def build_resource_keys(
    session: Session,
    process_type: str,
    business_date: date,
    sources: list[str],
) -> list[str]:
    keys: list[str] = []
    for source in sources:
        policy = session.get(ResourcePolicy, source)
        scope = policy.lock_scope if policy else "GLOBAL"
        if scope == "GLOBAL":
            keys.append(f"source:{source}")
        else:
            keys.append(f"source:{source}:{business_date.isoformat()}")
    keys.append(f"output:{process_type}:{business_date.isoformat()}")
    return sorted(keys)

def get_task_resources(session: Session, task_id: UUID) -> list[str]:
    return list(session.exec(
        select(TaskResource.resource_key).where(TaskResource.task_id == task_id)
    ).all())

def try_acquire_resources(
    session: Session,
    task_id: UUID,
) -> bool:
    """
    True  — task RUNNING, resources acquired.
    False — conflict, nothing acquired.
    """
    resource_keys = get_task_resources(session, task_id)
    try:
        with session.begin_nested():  
            for key in sorted(resource_keys):
                row = session.execute(
                    text("""
                        INSERT INTO resource_locks (resource_key, task_id)
                        VALUES (:key, :task_id)
                        ON CONFLICT (resource_key) DO NOTHING
                        RETURNING resource_key
                    """),
                    {"key": key, "task_id": task_id},
                ).first()
                if row is None:
                    raise ResourceConflict(key)

            updated = session.execute(
                text("""
                    UPDATE tasks
                    SET status = 'RUNNING', started_at = NOW()
                    WHERE id = :task_id AND status = 'QUEUED'
                    RETURNING id
                """),
                {"task_id": task_id},
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