import { getTask, updateTask, deleteTask } from "./api.js";

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

let currentTask = null;
let isSaving = false;

const editButton = document.getElementById("details-edit");
const editForm = document.getElementById("details-edit-form");
const editCancel = document.getElementById("edit-cancel");
const editSave = document.getElementById("edit-save");

const editProcess = document.getElementById("edit-process");
const editDate = document.getElementById("edit-date");
const editPriority = document.getElementById("edit-priority");
const editTrigger = document.getElementById("edit-trigger");
const editSources = document.getElementById("edit-sources");

const AVAILABLE_SOURCES = [
    "transactions",
    "market_data"
];

const deleteButton = document.getElementById("details-delete");

let isDeleting = false;

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
    currentTask = task;

    editButton.hidden = task.status !== "QUEUED";
    deleteButton.hidden = task.status !== "QUEUED";
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
    if (isSaving || isDeleting) {
        return;
    }

    currentTask = null;
    editForm.hidden = true;
    editButton.hidden = true;
    deleteButton.hidden = true;
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

async function removeCurrentTask() {
    if (
        !currentTask ||
        !currentTaskId ||
        currentTask.status !== "QUEUED" ||
        refreshButton.disabled ||
        isDeleting ||
        isSaving
    ) {
        return;
    }

    const confirmed = window.confirm(
        "Delete this task? This action cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    const taskId = currentTaskId;

    isDeleting = true;

    deleteButton.disabled = true;
    editButton.disabled = true;
    refreshButton.disabled = true;

    deleteButton.textContent = "Deleting...";

    showMessage("");

    try {
        await deleteTask(taskId);

        document.dispatchEvent(
            new CustomEvent("task:deleted")
        );

        if (dialog.open && currentTaskId === taskId) {
            dialog.close();
        }

    } catch (error) {
        if (!dialog.open || currentTaskId !== taskId) {
            return;
        }

        if (error.status === 409 || error.status === 404) {

            await loadTaskDetails(taskId);

            document.dispatchEvent(
                new CustomEvent("task:updated")
            );

            if (dialog.open && currentTaskId === taskId) {
                showMessage(
                    error.status === 409
                        ? "Task is no longer available for deletion"
                        : "Task no longer exists",
                    "error"
                );
            }

        } else {
            showMessage(error.message, "error");
        }

    } finally {
        isDeleting = false;

        deleteButton.disabled = false;
        editButton.disabled = false;
        refreshButton.disabled = false;

        deleteButton.textContent = "Delete task";
    }
}

function renderEditSources(selectedSources) {
    editSources.replaceChildren();

    const sources = new Set([
        ...AVAILABLE_SOURCES,
        ...selectedSources
    ]);

    for (const source of sources) {
        const label = document.createElement("label");
        label.className = "edit-source-option";

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = source;
        checkbox.checked = selectedSources.includes(source);

        const text = document.createElement("span");
        text.textContent = source;

        label.append(checkbox, text);
        editSources.appendChild(label);
    }
}

function startEditing() {
    if (
        !currentTask ||
        currentTask.status !== "QUEUED" ||
        refreshButton.disabled ||
        isSaving
    ) {
        return;
    }

    editProcess.value = currentTask.process_type;
    editDate.value = currentTask.business_date;
    editPriority.value = currentTask.priority;
    editTrigger.value = currentTask.trigger_type;

    renderEditSources(currentTask.sources);

    content.hidden = true;
    editForm.hidden = false;

    refreshButton.disabled = true;

    showMessage("");
}

function stopEditing() {
    editForm.hidden = true;

    content.hidden = !currentTask;

    refreshButton.disabled = false;
}

function buildUpdateData() {
    const sources = Array.from(
        editSources.querySelectorAll("input:checked")
    ).map(input => input.value);

    const data = {
        process_type: editProcess.value,
        business_date: editDate.value,
        priority: Number(editPriority.value),
        trigger_type: editTrigger.value,
        sources: sources
    };

    if (!data.process_type) {
        throw new Error("Select a process type");
    }

    if (!data.business_date) {
        throw new Error("Select a business date");
    }

    if (
        editPriority.value.trim() === "" ||
        !Number.isSafeInteger(data.priority)
    ) {
        throw new Error("Priority must be an integer");
    }

    if (sources.length === 0) {
        throw new Error("Select at least one data source");
    }

    const changes = {};

    for (const key of [
        "process_type",
        "business_date",
        "priority",
        "trigger_type"
    ]) {
        if (data[key] !== currentTask[key]) {
            changes[key] = data[key];
        }
    }

    const oldSources = [...currentTask.sources].sort();
    const newSources = [...sources].sort();

    if (
        JSON.stringify(oldSources) !==
        JSON.stringify(newSources)
    ) {
        changes.sources = sources;
    }

    return changes;
}

async function saveTaskChanges(event) {
    event.preventDefault();

    if (isSaving || !currentTaskId || !currentTask) {
        return;
    }

    let data;

    try {
        data = buildUpdateData();
    } catch (error) {
        showMessage(error.message, "error");
        return;
    }

    if (Object.keys(data).length === 0) {
        stopEditing();
        showMessage("No changes");
        return;
    }

    const taskId = currentTaskId;
    const version = requestVersion;

    isSaving = true;

    editSave.disabled = true;
    editCancel.disabled = true;
    editSave.textContent = "Saving...";

    showMessage("");

    try {
        const updatedTask = await updateTask(taskId, data);

        document.dispatchEvent(
            new CustomEvent("task:updated")
        );

        if (
            !dialog.open ||
            currentTaskId !== taskId ||
            requestVersion !== version
        ) {
            return;
        }

        renderTask(updatedTask);
        stopEditing();

        showMessage("Task updated successfully", "success");

    } catch (error) {
        if (
            !dialog.open ||
            currentTaskId !== taskId ||
            requestVersion !== version
        ) {
            return;
        }

        if (error.status === 409 || error.status === 404) {
            stopEditing();

            await loadTaskDetails(taskId);

            document.dispatchEvent(
                new CustomEvent("task:updated")
            );

            if (dialog.open && currentTaskId === taskId) {
                showMessage(
                    error.status === 409
                        ? "Task is no longer available for editing"
                        : "Task no longer exists",
                    "error"
                );
            }

        } else {
            showMessage(error.message, "error");
        }

    } finally {
        isSaving = false;

        editSave.disabled = false;
        editCancel.disabled = false;
        editSave.textContent = "Save changes";
    }
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
    currentTask = null;

    requestVersion++;

    content.hidden = true;
    editForm.hidden = true;
    editButton.hidden = true;
    deleteButton.hidden = true;

    refreshButton.disabled = false;
});

editButton.addEventListener("click", startEditing);

editCancel.addEventListener("click", () => {
    stopEditing();
    showMessage("");
});

editForm.addEventListener("submit", saveTaskChanges);

deleteButton.addEventListener("click", removeCurrentTask);