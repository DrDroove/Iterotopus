const API_URL = "/api/v1/tasks/";

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        let message = `HTTP error: ${response.status}`;

        try {
            const data = await response.json();

            if (typeof data.detail === "string") {
                message = data.detail;
            } else if (data.detail) {
                message = JSON.stringify(data.detail);
            }
        } catch {
            // Ответ сервера не содержит JSON.
        }

        const error = new Error(message);
        error.status = response.status;

        throw error;
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export function getTasks() {
    return request(API_URL);
}

export function getTask(taskId) {
    return request(API_URL + taskId);
}

export function createTask(data) {
    return request(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

export function updateTask(taskId, data) {
    return request(API_URL + taskId, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

export function deleteTask(taskId) {
    return request(API_URL + taskId, {
        method: "DELETE"
    });
}
