import { getTasks } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risks",
    market: "Market Risks",
    operational: "Operational Risks"
};

const QUEUE_POLL_MS = 1000;
let queueTimer = null;
let isQueueLoading = false;

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

function getBlockReason(queuedTask, runningTasks) {
    // 1. Ищем пересечение по источнику И дате расчета
    for (const active of runningTasks) {
        if (active.business_date === queuedTask.business_date) {
            const sharedSources = queuedTask.sources.filter((src) =>
                active.sources.includes(src)
            );
            if (sharedSources.length > 0) {
                const procName = PROCESS_NAMES[active.process_type] ?? active.process_type;
                return `Занят: ${sharedSources.join(", ")} (${procName})`;
            }
        }
    }

    // 2. Ищем пересечение только по источнику (если блокировка на весь источник)
    for (const active of runningTasks) {
        const sharedSources = queuedTask.sources.filter((src) =>
            active.sources.includes(src)
        );
        if (sharedSources.length > 0) {
            const procName = PROCESS_NAMES[active.process_type] ?? active.process_type;
            return `Занят источник: ${sharedSources.join(", ")} (${procName})`;
        }
    }

    // 3. Ищем пересечение по типу процесса
    const sameProcess = runningTasks.find(
        (active) => active.process_type === queuedTask.process_type
    );
    if (sameProcess) {
        const procName = PROCESS_NAMES[sameProcess.process_type] ?? sameProcess.process_type;
        return `Занят процесс: ${procName}`;
    }

    return "Ожидает слот выполнения";
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
                formatDateTime(task.started_at),
                "queue-time"
            ),

            createStatusCell(task.status)
        );

        table.appendChild(row);
    }
}

function renderWaitingTasks(waitingTasks, runningTasks) {
    const table = document.getElementById("waiting-table");

    table.replaceChildren();

    if (waitingTasks.length === 0) {
        renderEmptyTable(
            table,
            9,
            "Очередь пуста"
        );

        return;
    }

    waitingTasks.forEach((task, index) => {
        const row = document.createElement("tr");

        row.dataset.taskId = task.id;
        row.tabIndex = 0;

        const reasonCell = createCell(
            getBlockReason(task, runningTasks),
            "queue-time"
        );

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
                formatDateTime(task.created_at),
                "queue-time"
            ),

            createStatusCell(task.status),

            reasonCell
        );

        table.appendChild(row);
    });
}

function isQueuePageActive() {
    const table = document.getElementById("waiting-table");
    return Boolean(table && !document.hidden && table.offsetParent !== null);
}

function scheduleQueueRefresh() {
    clearTimeout(queueTimer);
    queueTimer = setTimeout(async () => {
        if (isQueuePageActive()) {
            try {
                await loadQueue();
            } catch {}
        } else {
            scheduleQueueRefresh();
        }
    }, QUEUE_POLL_MS);
}

export async function loadQueue() {
    if (isQueueLoading) return;

    const message = document.getElementById("queue-message");
    isQueueLoading = true;

    try {
        const tasks = await getTasks();

        const { running, waiting } = splitTasks(tasks);

        renderStatistics(running, waiting);

        renderRunningTasks(running);
        renderWaitingTasks(waiting, running);

        message.textContent = "";
        message.className = "message";

    } catch (error) {
        message.textContent = error.message;
        message.className = "message error";

        throw error;
    } finally {
        isQueueLoading = false;
        scheduleQueueRefresh();
    }
}
