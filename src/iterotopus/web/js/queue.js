import { getTasks } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risks",
    market: "Market Risks",
    operational: "Operational Risks"
};

function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("ru-RU");
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

    badge.className = `status status-${status.toLowerCase()}`;
    badge.textContent = status;

    cell.appendChild(badge);

    return cell;
}

function renderEmptyTable(table, columns, message) {
    const row = document.createElement("tr");
    const cell = createCell(message, "empty-state");

    cell.colSpan = columns;

    row.appendChild(cell);
    table.appendChild(row);
}


// Если приоритеты различаются, выше будет задача с большим приоритетом. 
// Если они одинаковые, выше будет задача, созданная раньше.
function splitTasks(tasks) {
    const running = tasks
        .filter(task => task.status === "RUNNING")
        .sort((a, b) =>
            new Date(a.started_at ?? a.created_at) -
            new Date(b.started_at ?? b.created_at)
        );

    const waiting = tasks
        .filter(task => task.status === "QUEUED")
        .sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }

            return new Date(a.created_at) -
                   new Date(b.created_at);
        });

    return {
        running,
        waiting
    };
}

function renderStatistics(running, waiting) {
    document.getElementById("queue-total").textContent =
        running.length + waiting.length;

    document.getElementById("queue-running").textContent =
        running.length;

    document.getElementById("queue-waiting").textContent =
        waiting.length;

    document.getElementById("running-count").textContent =
        `${running.length} task(s)`;

    document.getElementById("waiting-count").textContent =
        `${waiting.length} task(s)`;
}

function renderRunningTasks(tasks) {
    const table = document.getElementById("running-table");

    table.replaceChildren();

    if (tasks.length === 0) {
        renderEmptyTable(
            table,
            7,
            "Нет выполняющихся задач"
        );

        return;
    }

    for (const task of tasks) {
        const row = document.createElement("tr");

        row.dataset.taskId = task.id;

        row.tabIndex = 0;

        row.append(
            createCell(
                task.id.slice(0, 8),
                "task-id"
            ),

            createCell(
                PROCESS_NAMES[task.process_type] ??
                task.process_type
            ),

            createCell(task.business_date),

            createCell(task.sources.join(", ")),

            createCell(
                task.priority,
                "queue-priority"
            ),

            createCell(
                formatDateTime(task.started_at),
                "queue-time"
            ),

            createStatusCell(task.status)
        );

        table.appendChild(row);
    }
}

function renderWaitingTasks(tasks) {
    const table = document.getElementById("waiting-table");

    table.replaceChildren();

    if (tasks.length === 0) {
        renderEmptyTable(
            table,
            8,
            "Очередь пуста"
        );

        return;
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("tr");

        row.dataset.taskId = task.id;
        
        row.tabIndex = 0;

        row.append(
            createCell(
                index + 1,
                "queue-position"
            ),

            createCell(
                task.id.slice(0, 8),
                "task-id"
            ),

            createCell(
                PROCESS_NAMES[task.process_type] ??
                task.process_type
            ),

            createCell(task.business_date),

            createCell(task.sources.join(", ")),

            createCell(
                task.priority,
                "queue-priority"
            ),

            createCell(
                formatDateTime(task.created_at),
                "queue-time"
            ),

            createStatusCell(task.status)
        );

        table.appendChild(row);
    });
}

export async function loadQueue() {
    const message = document.getElementById("queue-message");

    try {
        const tasks = await getTasks();

        const { running, waiting } = splitTasks(tasks);

        renderStatistics(running, waiting);

        renderRunningTasks(running);
        renderWaitingTasks(waiting);

        message.textContent = "";
        message.className = "message";

    } catch (error) {
        message.textContent = error.message;
        message.className = "message error";

        throw error;
    }
}