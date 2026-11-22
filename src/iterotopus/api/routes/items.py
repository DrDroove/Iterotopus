from fastapi import APIRouter, HTTPException
from sqlmodel import select

from iterotopus.database import SessionDep
from iterotopus.models import Item
from iterotopus.schemas.item import ItemCreate, ItemRead, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


@router.post("/", response_model=ItemRead, status_code=201)
def create_item(data: ItemCreate, session: SessionDep):
    item = Item.model_validate(data)

    session.add(item)
    session.commit()
    session.refresh(item)

    return item


@router.get("/", response_model=list[ItemRead])
def list_items(session: SessionDep):
    statement = select(Item).order_by(Item.id)
    return session.exec(statement).all()


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int, session: SessionDep):
    item = session.get(Item, item_id)

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: int,
    data: ItemUpdate,
    session: SessionDep,
):
    item = session.get(Item, item_id)

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    item.sqlmodel_update(data.model_dump(exclude_unset=True))

    session.add(item)
    session.commit()
    session.refresh(item)

    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, session: SessionDep):
    item = session.get(Item, item_id)

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    session.delete(item)
    session.commit()
