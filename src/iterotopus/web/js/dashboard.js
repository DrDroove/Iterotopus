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

const FAST_POLL_MS = 1000;
const IDLE_POLL_MS = 5000;

let autoRefreshTimer = null;
let isLoading = false;
let lastTasksSignature = "";

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
        const element = document.getElementById(`stat-${name}`);
        if (element) {
            element.textContent = value;
        }
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

function getDashboardBlockReason(queuedTask, allTasks) {
    const runningTasks = allTasks.filter((t) => t.status === "RUNNING");

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

    for (const active of runningTasks) {
        const sharedSources = queuedTask.sources.filter((src) =>
            active.sources.includes(src)
        );
        if (sharedSources.length > 0) {
            const procName = PROCESS_NAMES[active.process_type] ?? active.process_type;
            return `Занят источник: ${sharedSources.join(", ")} (${procName})`;
        }
    }

    return "";
}


function createStatusCell(task, allTasks) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    const statusClass = KNOWN_STATUSES.includes(task.status)
        ? task.status.toLowerCase()
        : "unknown";

    badge.className = `status status-${statusClass}`;
    badge.textContent = task.status;

    cell.appendChild(badge);

    if (task.status === "QUEUED") {
        const reason = getDashboardBlockReason(task, allTasks);
        if (reason) {
            const reasonEl = document.createElement("div");
            reasonEl.textContent = reason;
            reasonEl.style.fontSize = "12px";
            reasonEl.style.color = "#6b7280";
            reasonEl.style.marginTop = "4px";
            cell.appendChild(reasonEl);
        }
    }

    return cell;
}


function renderRecentTasks(tasks) {
    const table = document.getElementById("tasks-table");
    if (!table) {
        return;
    }

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

        row.appendChild(createStatusCell(task, tasks));

        table.appendChild(row);
    }
}

function getTasksSignature(tasks) {
    return tasks
        .map((t) => `${t.id}:${t.status}:${t.priority}:${t.finished_at ?? ""}`)
        .join("|");
}

function hasActiveTasks(tasks) {
    return tasks.some((t) => t.status === "QUEUED" || t.status === "RUNNING");
}

function isDashboardActive() {
    const table = document.getElementById("tasks-table");
    return Boolean(table && !document.hidden && table.offsetParent !== null);
}

function scheduleNextRefresh(delay = FAST_POLL_MS) {
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = setTimeout(async () => {
        if (isDashboardActive()) {
            try {
                await loadDashboard();
            } catch {}
        } else {
            scheduleNextRefresh(IDLE_POLL_MS);
        }
    }, delay);
}

export async function loadDashboard(forceRender = false) {
    if (isLoading) {
        return;
    }

    const message = document.getElementById("dashboard-message");
    isLoading = true;
    let nextDelay = IDLE_POLL_MS;

    try {
        const tasks = await getTasks();
        const currentSignature = getTasksSignature(tasks);

        if (forceRender || currentSignature !== lastTasksSignature) {
            renderStatistics(tasks);
            renderRecentTasks(tasks);
            lastTasksSignature = currentSignature;
        }

        nextDelay = hasActiveTasks(tasks) ? FAST_POLL_MS : IDLE_POLL_MS;

        if (message) {
            message.textContent = "";
            message.className = "message";
        }
    } catch (error) {
        if (message) {
            message.textContent = error.message;
            message.className = "message error";
        }

        throw error;
    } finally {
        isLoading = false;
        scheduleNextRefresh(nextDelay);
    }
}

document.addEventListener("visibilitychange", () => {
    if (isDashboardActive()) {
        loadDashboard();
    }
});
