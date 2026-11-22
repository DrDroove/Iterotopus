def test_create_item(client):
    response = client.post(
        "/api/v1/items/",
        json={
            "name": "Laptop",
            "description": "Development laptop",
            "price": 1200,
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Laptop"
    assert data["price"] == 1200
    assert data["id"] is not None


def test_list_items(client):
    client.post(
        "/api/v1/items/",
        json={
            "name": "Keyboard",
            "description": "Mechanical keyboard",
            "price": 100,
        },
    )

    response = client.get("/api/v1/items/")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_missing_item(client):
    response = client.get("/api/v1/items/999")

    assert response.status_code == 404
