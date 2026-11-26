import { getTasks } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risk",
    market: "Market Risk",
    operational: "Operational Risk"
};

const FINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

let currentFilter = "ALL";
let cachedTasks = [];

function createCell(value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) {
        cell.className = className;
    }
    return cell;
}

function formatDuration(startedAt, finishedAt) {
    if (!startedAt || !finishedAt) return "—";
    const diffMs = new Date(finishedAt) - new Date(startedAt);
    if (diffMs < 0) return "—";
    const seconds = (diffMs / 1000).toFixed(1);
    return `${seconds}s`;
}

function formatDateTime(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function createStatusCell(task) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    const statusClass = FINAL_STATUSES.includes(task.status)
        ? task.status.toLowerCase()
        : "unknown";

    badge.className = `status status-${statusClass}`;
    badge.textContent = task.status;
    cell.appendChild(badge);

    if (task.error) {
        const errorText = document.createElement("div");
        errorText.textContent = task.error;
        errorText.style.fontSize = "12px";
        errorText.style.color = "#dc2626";
        errorText.style.marginTop = "4px";
        cell.appendChild(errorText);
    }

    return cell;
}

function renderHistoryTable() {
    const table = document.getElementById("history-table");
    if (!table) return;

    table.replaceChildren();

    const filtered = cachedTasks
        .filter((task) => FINAL_STATUSES.includes(task.status))
        .filter((task) => currentFilter === "ALL" || task.status === currentFilter)
        .sort((a, b) => new Date(b.finished_at || b.created_at) - new Date(a.finished_at || a.created_at));

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("Завершенных задач пока нет", "empty-state");
        cell.colSpan = 8;
        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    for (const task of filtered) {
        const row = document.createElement("tr");
        row.dataset.taskId = task.id;
        row.tabIndex = 0;

        row.appendChild(createCell(task.id.slice(0, 8), "task-id"));
        row.appendChild(createCell(PROCESS_NAMES[task.process_type] ?? task.process_type));
        row.appendChild(createCell(task.business_date));
        row.appendChild(createCell(task.sources.join(", ")));
        row.appendChild(createCell(task.trigger_type ?? "MANUAL"));
        row.appendChild(createCell(formatDuration(task.started_at, task.finished_at)));
        row.appendChild(createCell(formatDateTime(task.finished_at)));
        row.appendChild(createStatusCell(task));

        table.appendChild(row);
    }
}

export function initHistoryFilters() {
    const buttons = document.querySelectorAll("[data-history-filter]");
    for (const btn of buttons) {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.historyFilter;
            for (const b of buttons) {
                b.classList.toggle("active", b === btn);
            }
            renderHistoryTable();
        });
    }
}

export async function loadHistory() {
    const message = document.getElementById("history-message");

    try {
        cachedTasks = await getTasks();
        renderHistoryTable();

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
    }
}
