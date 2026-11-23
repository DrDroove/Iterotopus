from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from iterotopus.database import SessionDep
from iterotopus.models.resource_lock import ResourceLock
from iterotopus.models.task import Task
from iterotopus.models.task_resource import TaskResource
from iterotopus.resource_keys import build_resource_keys
from iterotopus.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def to_task_read(task: Task, session: SessionDep) -> TaskRead:
    resources = session.exec(
        select(TaskResource).where(TaskResource.task_id == task.id)
    ).all()

    sources = sorted(
        resource.resource_key.removeprefix("source:")
        for resource in resources
        if resource.resource_key.startswith("source:")
    )

    return TaskRead(
        **task.model_dump(),
        sources=sources,
    )


@router.post("/", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, session: SessionDep):
    sources = [source.strip() for source in data.sources]

    if any(not source or ":" in source for source in sources):
        raise HTTPException(
            status_code=422,
            detail="Invalid source name",
        )

    if len(sources) != len(set(sources)):
        raise HTTPException(
            status_code=422,
            detail="Duplicate sources are not allowed",
        )

    task = Task(**data.model_dump(exclude={"sources"}))

    session.add(task)
    session.flush()

    for resource_key in build_resource_keys(
        session, task.process_type, task.business_date, sources
    ):
        session.add(
            TaskResource(
                task_id=task.id,
                resource_key=(resource_key),
            )
        )

    session.commit()
    session.refresh(task)

    return to_task_read(task, session)


@router.get("/", response_model=list[TaskRead])
def list_tasks(session: SessionDep):
    tasks = session.exec(select(Task).order_by(Task.created_at)).all()

    return [to_task_read(task, session) for task in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, session: SessionDep):
    task = session.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    return to_task_read(task, session)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    session: SessionDep,
):
    task = session.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    if task.status != "QUEUED":
        raise HTTPException(
            status_code=409,
            detail="Only queued tasks can be updated",
        )

    changes = data.model_dump(exclude_unset=True)
    sources = changes.pop("sources", None)

    if any(value is None for value in changes.values()):
        raise HTTPException(
            status_code=422,
            detail="Task fields cannot be null",
        )

    if sources is not None:
        sources = [source.strip() for source in sources]

        if (
            not sources
            or any(not source or ":" in source for source in sources)
            or len(sources) != len(set(sources))
        ):
            raise HTTPException(
                status_code=422,
                detail="Invalid or duplicate sources",
            )

    task.sqlmodel_update(changes)

    # Если изменились источники, дата или тип процесса,
    # пересоздаём связанные ресурсные ключи.
    if changes or sources is not None:
        existing_resources = session.exec(
            select(TaskResource).where(TaskResource.task_id == task_id)
        ).all()

        if sources is None:
            sources = [
                resource.resource_key.removeprefix("source:")
                for resource in existing_resources
                if resource.resource_key.startswith("source:")
            ]

        for resource in existing_resources:
            session.delete(resource)

        session.flush()

        for source in sources:
            session.add(
                TaskResource(
                    task_id=task_id,
                    resource_key=f"source:{source}",
                )
            )

        session.add(
            TaskResource(
                task_id=task_id,
                resource_key=(f"output:{task.process_type}:{task.business_date}"),
            )
        )

    session.add(task)
    session.commit()
    session.refresh(task)

    return to_task_read(task, session)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: UUID, session: SessionDep):
    task = session.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    if task.status != "QUEUED":
        raise HTTPException(
            status_code=409,
            detail="Only queued tasks can be deleted",
        )

    lock = session.exec(
        select(ResourceLock).where(ResourceLock.task_id == task_id)
    ).first()

    if lock is not None:
        raise HTTPException(
            status_code=409,
            detail="Task has acquired resources",
        )

    resources = session.exec(
        select(TaskResource).where(TaskResource.task_id == task_id)
    ).all()

    for resource in resources:
        session.delete(resource)

    session.flush()

    session.delete(task)
    session.commit()
