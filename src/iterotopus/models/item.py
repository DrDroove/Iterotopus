from sqlmodel import Field, SQLModel


class Item(SQLModel, table=True):
    __tablename__ = "items"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, min_length=1, max_length=100)
    description: str | None = None
    price: float = Field(gt=0)
