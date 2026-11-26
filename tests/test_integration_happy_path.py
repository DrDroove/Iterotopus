import asyncio
from datetime import date
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from iterotopus.models import Task, TaskResource
from iterotopus.orchestration.scheduler import Scheduler


@pytest.mark.asyncio
async def test_scheduler_happy_path(test_engine):
    # 1. Создаем задачи в базе
    with Session(test_engine) as session:
        # Задача A (credit, transactions)
        task_a = Task(
            id=uuid4(),
            process_type="credit",
            business_date=date(2026, 11, 20),
            status="QUEUED",
        )
        session.add(task_a)
        session.flush()
        session.add(TaskResource(task_id=task_a.id, resource_key="source:transactions"))

        # Задача B (market, transactions) - БУДЕТ ЖДАТЬ A
        task_b = Task(
            id=uuid4(),
            process_type="market",
            business_date=date(2026, 11, 21),
            status="QUEUED",
        )
        session.add(task_b)
        session.flush()
        session.add(TaskResource(task_id=task_b.id, resource_key="source:transactions"))

        # Задача C (operational, market_data) - ПОЙДЕТ ПАРАЛЛЕЛЬНО С A
        task_c = Task(
            id=uuid4(),
            process_type="operational",
            business_date=date(2026, 11, 20),
            status="QUEUED",
        )
        session.add(task_c)
        session.flush()
        session.add(TaskResource(task_id=task_c.id, resource_key="source:market_data"))

        session.commit()
        print("\n--- Задачи добавлены в БД ---")

    # 2. Запускаем планировщик (в фоне)
    # Передаем ему execute_task (оркестратор)
    scheduler = Scheduler()
    scheduler_task = asyncio.create_task(scheduler.run())

    print("--- Планировщик запущен, ждем 10 секунд ---")

    # 3. Даем системе поработать 10 секунд
    # За это время задачи должны выполниться (или заблокироваться)
    await asyncio.sleep(10)

    # 4. Останавливаем планировщик
    scheduler.stop()
    await scheduler_task
    print("--- Планировщик остановлен ---")

    # 5. Смотрим, что в базе
    with Session(test_engine) as session:
        tasks = session.exec(select(Task)).all()
        print("\n--- РЕЗУЛЬТАТЫ ---")
        for t in tasks:
            print(f"Задача {t.process_type} ({t.business_date}): {t.status}")

        # Проверяем, что все задачи в итоге завершились (A и C сразу, B после A)
        assert all(t.status == "COMPLETED" for t in tasks), "Не все задачи завершились!"
