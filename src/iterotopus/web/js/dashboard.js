import { getTasks } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risk",
    market: "Market Risk",
    operational: "Operational Risk"
};

const KNOWN_STATUSES = [
    "QUEUED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "CANCELLED"
];

function renderStatistics(tasks) {
    const stats = {
        total: tasks.length,
        running: 0,
        queued: 0,
        completed: 0,
        failed: 0
    };

    for (const task of tasks) {
        switch (task.status) {
            case "RUNNING":
                stats.running++;
                break;

            case "QUEUED":
                stats.queued++;
                break;

            case "COMPLETED":
                stats.completed++;
                break;

            case "FAILED":
                stats.failed++;
                break;
        }
    }

    for (const [name, value] of Object.entries(stats)) {
        document.getElementById(`stat-${name}`).textContent = value;
    }
}

function createCell(value, className = "") {
    const cell = document.createElement("td");

    cell.textContent = value;

    if (className) {
        cell.className = className;
    }

    return cell;
}

function createStatusCell(status) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    const statusClass = KNOWN_STATUSES.includes(status)
        ? status.toLowerCase()
        : "unknown";

    badge.className = `status status-${statusClass}`;
    badge.textContent = status;

    cell.appendChild(badge);

    return cell;
}

function renderRecentTasks(tasks) {
    const table = document.getElementById("tasks-table");

    table.replaceChildren();

    const recentTasks = [...tasks]
        .sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        )
        .slice(0, 10);

    if (recentTasks.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("Задач пока нет", "empty-state");

        cell.colSpan = 6;

        row.appendChild(cell);
        table.appendChild(row);

        return;
    }

    for (const task of recentTasks) {
        const row = document.createElement("tr");

        row.dataset.taskId = task.id;
        row.tabIndex = 0;

        row.appendChild(
            createCell(task.id.slice(0, 8), "task-id")
        );

        row.appendChild(
            createCell(
                PROCESS_NAMES[task.process_type] ?? task.process_type
            )
        );

        row.appendChild(createCell(task.business_date));

        row.appendChild(
            createCell(task.sources.join(", "))
        );

        row.appendChild(createCell(task.priority));

        row.appendChild(createStatusCell(task.status));

        table.appendChild(row);
    }
}

export async function loadDashboard() {
    const message = document.getElementById("dashboard-message");

    try {
        const tasks = await getTasks();

        renderStatistics(tasks);
        renderRecentTasks(tasks);

        message.textContent = "";
        message.className = "message";

    } catch (error) {
        message.textContent = error.message;
        message.className = "message error";

        throw error;
    }
}
