from sqlmodel import Field, SQLModel


class ItemCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    price: float = Field(gt=0)


class ItemUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=100)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)


class ItemRead(SQLModel):
    id: int
    name: str
    description: str | None
    price: float
