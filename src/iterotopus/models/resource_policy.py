from sqlmodel import Field, SQLModel


class ResourcePolicy(SQLModel, table=True):
    __tablename__ = "resource_policies"

    source_id: str = Field(primary_key=True, max_length=100)

    lock_scope: str = Field(max_length=20)
