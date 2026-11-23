from uuid import uuid4


def make_task_data():
    return {
        "process_type": "credit",
        "business_date": "2026-11-20",
        "sources": ["transactions"],
        "priority": 1,
        "trigger_type": "MANUAL",
    }


def test_create_task(client):
    response = client.post(
        "/api/v1/tasks/",
        json=make_task_data(),
    )

    assert response.status_code == 201

    task = response.json()

    assert task["process_type"] == "credit"
    assert task["business_date"] == "2026-11-20"
    assert task["sources"] == ["transactions"]
    assert task["status"] == "QUEUED"
    assert "id" in task


def test_list_tasks(client):
    client.post("/api/v1/tasks/", json=make_task_data())
    client.post("/api/v1/tasks/", json=make_task_data())

    response = client.get("/api/v1/tasks/")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_task_by_id(client):
    created = client.post(
        "/api/v1/tasks/",
        json=make_task_data(),
    ).json()

    response = client.get(f"/api/v1/tasks/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_task(client):
    created = client.post(
        "/api/v1/tasks/",
        json=make_task_data(),
    ).json()

    response = client.patch(
        f"/api/v1/tasks/{created['id']}",
        json={"priority": 5},
    )

    assert response.status_code == 200
    assert response.json()["priority"] == 5

    saved = client.get(f"/api/v1/tasks/{created['id']}").json()

    assert saved["priority"] == 5


def test_update_task_sources(client):
    created = client.post(
        "/api/v1/tasks/",
        json=make_task_data(),
    ).json()

    response = client.patch(
        f"/api/v1/tasks/{created['id']}",
        json={"sources": ["market_data"]},
    )

    assert response.status_code == 200
    assert response.json()["sources"] == ["market_data"]


def test_delete_task(client):
    created = client.post(
        "/api/v1/tasks/",
        json=make_task_data(),
    ).json()

    response = client.delete(f"/api/v1/tasks/{created['id']}")

    assert response.status_code == 204

    get_response = client.get(f"/api/v1/tasks/{created['id']}")

    assert get_response.status_code == 404


def test_get_missing_task(client):
    response = client.get(f"/api/v1/tasks/{uuid4()}")

    assert response.status_code == 404


def test_create_task_without_sources(client):
    data = make_task_data()
    data["sources"] = []

    response = client.post(
        "/api/v1/tasks/",
        json=data,
    )

    assert response.status_code == 422


def test_create_task_with_duplicate_sources(client):
    data = make_task_data()
    data["sources"] = [
        "transactions",
        "transactions",
    ]

    response = client.post(
        "/api/v1/tasks/",
        json=data,
    )

    assert response.status_code == 422
