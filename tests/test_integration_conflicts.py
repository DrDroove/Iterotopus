import asyncio
from datetime import date
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from iterotopus.models import Task, TaskResource
from iterotopus.orchestration.scheduler import Scheduler


@pytest.mark.asyncio
async def test_separate_tasks_run_parallel_while_dependent_task_wait(test_engine):
    # 1. Создаем задачи в базе
    with Session(test_engine) as session:
        # Задача A (credit, transactions)
        task_a_id = uuid4()

        task_a = Task(
            id=task_a_id,
            process_type="credit",
            business_date=date(2026, 11, 20),
            status="QUEUED",
        )
        session.add(task_a)
        session.flush()
        session.add(TaskResource(task_id=task_a_id, resource_key="source:transactions"))

        # Задача B (market, transactions) - БУДЕТ ЖДАТЬ A
        task_b_id = uuid4()
        task_b = Task(
            id=task_b_id,
            process_type="market",
            business_date=date(2026, 11, 21),
            status="QUEUED",
        )
        session.add(task_b)
        session.flush()
        session.add(TaskResource(task_id=task_b_id, resource_key="source:transactions"))

        # Задача C (operational, market_data) - ПОЙДЕТ ПАРАЛЛЕЛЬНО С A
        task_c_id = uuid4()

        task_c = Task(
            id=task_c_id,
            process_type="operational",
            business_date=date(2026, 11, 20),
            status="QUEUED",
        )
        session.add(task_c)
        session.flush()
        session.add(TaskResource(task_id=task_c_id, resource_key="source:market_data"))

        session.commit()
        print("\n--- Задачи добавлены в БД ---")

    scheduler = Scheduler()
    scheduler_task = asyncio.create_task(scheduler.run())

    await asyncio.sleep(0.11)

    # 4. Останавливаем планировщик
    scheduler.stop()
    await scheduler_task

    # 5. Смотрим, что в базе
    with Session(test_engine) as session:
        tasks = session.exec(select(Task)).all()
        print("\n--- РЕЗУЛЬТАТЫ ---")
        for t in tasks:
            if t.id == task_b_id:
                assert t.status == "QUEUED"
            else:
                assert t.status == "COMPLETED"
