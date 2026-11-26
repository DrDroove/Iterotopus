from uuid import UUID

from sqlmodel import select

from iterotopus.models import ResourceLock
from iterotopus.orchestration.resource_manager import (
    release_resources,
    try_acquire_resources,
)


def test_independet_tasks_acquire_resources(session, client):
    response_a = client.post(
        "/api/v1/tasks/",
        json={
            "process_type": "credit",
            "business_date": "2026-11-20",
            "sources": ["transactions"],
            "trigger_type": "MANUAL",
        },
    )

    task_a = response_a.json()

    response_b = client.post(
        "/api/v1/tasks/",
        json={
            "process_type": "credit",
            "business_date": "2026-11-21",
            "sources": ["market_data"],
            "trigger_type": "MANUAL",
        },
    )

    task_b = response_b.json()

    assert try_acquire_resources(session, UUID(task_a["id"])) is True
    assert try_acquire_resources(session, UUID(task_b["id"])) is True

    assert session.get(ResourceLock, "source:transactions").task_id == UUID(
        task_a["id"]
    )
    assert session.get(ResourceLock, "source:market_data").task_id == UUID(task_b["id"])


def test_conflict_rolls_back_partial_acquire(session, client):
    response_a = client.post(
        "/api/v1/tasks/",
        json={
            "process_type": "credit",
            "business_date": "2026-11-20",
            "sources": ["transactions"],
            "trigger_type": "MANUAL",
        },
    )

    task_a = response_a.json()

    response_b = client.post(
        "/api/v1/tasks/",
        json={
            "process_type": "credit",
            "business_date": "2026-11-21",
            "sources": ["transactions", "market_data"],
            "trigger_type": "MANUAL",
        },
    )

    task_b = response_b.json()

    assert try_acquire_resources(session, UUID(task_a["id"])) is True
    assert try_acquire_resources(session, UUID(task_b["id"])) is False

    locks = (
        session.execute(
            select(ResourceLock).where(ResourceLock.task_id == UUID(task_b["id"]))
        )
        .scalars()
        .all()
    )
    assert locks == []

    assert session.get(ResourceLock, "source:transactions").task_id == UUID(
        task_a["id"]
    )


def test_release_after_success(session, client):
    response_a = client.post(
        "/api/v1/tasks/",
        json={
            "process_type": "credit",
            "business_date": "2026-11-20",
            "sources": ["transactions"],
            "trigger_type": "MANUAL",
        },
    )

    task = response_a.json()

    assert try_acquire_resources(session, UUID(task["id"])) is True
    assert session.execute(select(ResourceLock)).scalars().all() != []

    release_resources(session, UUID(task["id"]))
    assert session.execute(select(ResourceLock)).scalars().all() == []
