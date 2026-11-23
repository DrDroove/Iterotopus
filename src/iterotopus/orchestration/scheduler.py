# iterotopus/scheduler.py
import asyncio
import logging

from sqlmodel import Session, select

from iterotopus import database
from iterotopus.models import Task
from iterotopus.orchestration.orchestrator import execute_task
from iterotopus.orchestration.resource_manager import try_acquire_resources

logger = logging.getLogger(__name__)

POLL_INTERVAL = 0.5
MAX_CONCURRENT = 10


class Scheduler:
    def __init__(self) -> None:
        self._wake = asyncio.Event()
        self._running_tasks: set[asyncio.Task] = set()
        self._stop = False

    def wake_up(self) -> None:
        self._wake.set()

    async def run(self) -> None:
        logger.info("scheduler started")
        while not self._stop:
            try:
                self._dispatch_queued()
            except Exception:
                logger.exception("scheduler tick failed")

            try:
                await asyncio.wait_for(self._wake.wait(), timeout=POLL_INTERVAL)
            except TimeoutError:
                pass
            finally:
                self._wake.clear()

        # graceful shutdown: дождаться текущих задач
        if self._running_tasks:
            await asyncio.gather(*self._running_tasks, return_exceptions=True)
        logger.info("scheduler stopped")

    def stop(self) -> None:
        self._stop = True
        self._wake.set()

    def _dispatch_queued(self) -> None:
        if len(self._running_tasks) >= MAX_CONCURRENT:
            return

        with Session(database.engine) as session:
            queued = session.exec(
                select(Task)
                .where(Task.status == "QUEUED")
                .order_by(Task.priority.desc(), Task.created_at.asc())
            ).all()

            for task in queued:
                if len(self._running_tasks) >= MAX_CONCURRENT:
                    break

                acquired = try_acquire_resources(session, task.id)
                if not acquired:
                    continue

                atask = asyncio.create_task(self._run_and_track(task.id))
                self._running_tasks.add(atask)
                atask.add_done_callback(self._running_tasks.discard)

    async def _run_and_track(self, task_id) -> None:
        try:
            await execute_task(task_id)
        finally:
            self.wake_up()
