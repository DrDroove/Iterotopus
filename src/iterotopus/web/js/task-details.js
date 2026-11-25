import { getTask } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risks",
    market: "Market Risks",
    operational: "Operational Risks"
};

const KNOWN_STATUSES = [
    "QUEUED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "CANCELLED"
];

const dialog = document.getElementById("task-details");

const content = document.getElementById("details-content");
const message = document.getElementById("details-message");

const refreshButton = document.getElementById("details-refresh");

let currentTaskId = null;
let requestVersion = 0;

function setText(id, value) {
    document.getElementById(id).textContent = value ?? "—";
}

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

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function renderStatus(status) {
    const element = document.getElementById("details-status");

    const statusClass = KNOWN_STATUSES.includes(status)
        ? status.toLowerCase()
        : "unknown";

    element.className = `status status-${statusClass}`;
    element.textContent = status;
}

function renderSources(sources) {
    const container = document.getElementById("details-sources");

    container.replaceChildren();

    if (!sources || sources.length === 0) {
        container.textContent = "No data sources";
        return;
    }

    for (const source of sources) {
        const element = document.createElement("span");

        element.className = "details-source";
        element.textContent = source;

        container.appendChild(element);
    }
}

function createTimelineItem(
    title,
    description,
    state,
    symbol
) {
    const item = document.createElement("div");
    item.className = `timeline-item ${state}`;

    const dot = document.createElement("div");
    dot.className = "timeline-dot";
    dot.textContent = symbol;

    const content = document.createElement("div");
    content.className = "timeline-content";

    const titleElement = document.createElement("div");
    titleElement.className = "timeline-title";
    titleElement.textContent = title;

    const descriptionElement = document.createElement("div");
    descriptionElement.className = "timeline-description";
    descriptionElement.textContent = description;

    content.append(titleElement, descriptionElement);
    item.append(dot, content);

    return item;
}

function renderTimeline(task) {
    const timeline = document.getElementById("details-timeline");

    timeline.replaceChildren();

    const isQueued = task.status === "QUEUED";
    const isRunning = task.status === "RUNNING";
    const isCompleted = task.status === "COMPLETED";
    const isFailed = task.status === "FAILED";
    const isCancelled = task.status === "CANCELLED";

    // Создание задачи

    timeline.appendChild(
        createTimelineItem(
            "Task created",
            formatDateTime(task.created_at),
            "done",
            "✓"
        )
    );

    // Ожидание в очереди

    timeline.appendChild(
        createTimelineItem(
            "Waiting in queue",
            isQueued
                ? "Waiting for execution"
                : task.started_at
                    ? "Task dispatched"
                    : "No longer queued",
            isQueued ? "active" : task.started_at ? "done" : "pending",
            isQueued ? "◷" : task.started_at ? "✓" : ""
        )
    );

    // Начало выполнения

    timeline.appendChild(
        createTimelineItem(
            "Execution started",
            task.started_at
                ? formatDateTime(task.started_at)
                : "Not started",
            isRunning
                ? "running"
                : task.started_at
                    ? "done"
                    : "pending",
            isRunning
                ? "▶"
                : task.started_at
                    ? "✓"
                    : ""
        )
    );

    // Завершение задачи

    let finishTitle = "Execution finished";
    let finishState = "pending";
    let finishSymbol = "";

    if (isCompleted) {
        finishTitle = "Completed successfully";
        finishState = "done";
        finishSymbol = "✓";
    }

    if (isFailed) {
        finishTitle = "Execution failed";
        finishState = "failed";
        finishSymbol = "!";
    }

    if (isCancelled) {
        finishTitle = "Task cancelled";
        finishState = "pending";
        finishSymbol = "×";
    }

    timeline.appendChild(
        createTimelineItem(
            finishTitle,
            task.finished_at
                ? formatDateTime(task.finished_at)
                : "—",
            finishState,
            finishSymbol
        )
    );
}

function renderTask(task) {
    setText("details-id", task.id);

    setText(
        "details-process-name",
        PROCESS_NAMES[task.process_type] ?? task.process_type
    );

    setText("details-process", task.process_type);
    setText("details-date", task.business_date);
    setText("details-priority", task.priority);
    setText("details-trigger", task.trigger_type);

    renderStatus(task.status);
    renderSources(task.sources);
    renderTimeline(task);

    const errorSection = document.getElementById(
        "details-error-section"
    );

    errorSection.hidden = !task.error;

    setText("details-error", task.error);
}

async function loadTaskDetails(taskId) {
    const version = ++requestVersion;

    refreshButton.disabled = true;

    showMessage("Loading task...");

    try {
        const task = await getTask(taskId);

        if (
            version !== requestVersion ||
            currentTaskId !== taskId ||
            !dialog.open
        ) {
            return;
        }

        renderTask(task);

        content.hidden = false;

        showMessage("");

    } catch (error) {
        if (version !== requestVersion) {
            return;
        }

        content.hidden = true;

        showMessage(error.message, "error");

    } finally {
        if (version === requestVersion) {
            refreshButton.disabled = false;
        }
    }
}

export function openTaskDetails(taskId) {
    currentTaskId = taskId;

    content.hidden = true;

    if (!dialog.open) {
        dialog.showModal();
    }

    loadTaskDetails(taskId);
}

function closeTaskDetails() {
    dialog.close();
}

document.getElementById("details-close")
    .addEventListener("click", closeTaskDetails);

document.getElementById("details-close-footer")
    .addEventListener("click", closeTaskDetails);

refreshButton.addEventListener("click", () => {
    if (currentTaskId) {
        loadTaskDetails(currentTaskId);
    }
});

dialog.addEventListener("close", () => {
    currentTaskId = null;

    requestVersion++;

    content.hidden = true;
});