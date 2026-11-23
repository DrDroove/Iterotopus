import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from iterotopus.database import get_session
from iterotopus.main import app


@pytest.fixture
def test_engine(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_file}", poolclass=StaticPool, echo=False)

    SQLModel.metadata.create_all(engine)

    import iterotopus.database as db_module

    monkeypatch.setattr(db_module, "engine", engine)

    yield engine
    SQLModel.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(test_engine):
    def get_test_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture
def session(test_engine):
    with Session(test_engine) as s:
        yield s

    SQLModel.metadata.drop_all(test_engine)
    test_engine.dispose()
