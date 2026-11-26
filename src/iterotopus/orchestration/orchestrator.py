# iterotopus/orchestrator.py
import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Session

from iterotopus import database
from iterotopus.models import Task
from iterotopus.orchestration.resource_manager import release_resources
from iterotopus.orchestration.workers import CALCULATORS

logger = logging.getLogger(__name__)


async def execute_task(task_id: UUID) -> None:
    with Session(database.engine) as session:
        task = session.get(Task, task_id)
        if task is None:
            return
        process_type = task.process_type

    try:
        calculator = CALCULATORS.get(process_type)
        if calculator is None:
            raise ValueError(f"No calculator for process_type={process_type}")
        await calculator(task)

        _finish_task(task_id, status="COMPLETED")

    except asyncio.CancelledError:
        _finish_task(task_id, status="CANCELLED")
        raise

    except Exception as e:
        _finish_task(task_id, status="FAILED", error=str(e))
        logger.exception("task %s failed", task_id)

    finally:
        with Session(database.engine) as session:
            release_resources(session, task_id)


def _finish_task(task_id: UUID, status: str, error: str | None = None) -> None:
    with Session(database.engine) as session:
        task = session.get(Task, task_id)
        if task is None:
            return
        task.status = status
        task.finished_at = datetime.now(UTC)
        if error is not None:
            task.error = error
        session.add(task)
        session.commit()
