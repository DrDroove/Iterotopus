import { getTasks } from "./api.js";

const PROCESS_NAMES = {
    credit: "Credit Risks",
    market: "Market Risks",
    operational: "Operational Risks"
};

const KNOWN_SOURCES = [
    { id: "transactions", name: "Transactions" },
    { id: "market_data", name: "Market Data" }
];

const RESOURCES_POLL_MS = 1000;
let resourcesTimer = null;
let isResourcesLoading = false;

function createCell(value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) {
        cell.className = className;
    }
    return cell;
}

function createStatusCell(isLocked) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = isLocked ? "status status-running" : "status status-completed";
    badge.textContent = isLocked ? "LOCKED" : "FREE";

    cell.appendChild(badge);
    return cell;
}

function renderResourcesTable(tasks) {
    const table = document.getElementById("resources-table");
    if (!table) return;

    table.replaceChildren();

    const runningTasks = tasks.filter((task) => task.status === "RUNNING");
    const queuedTasks = tasks.filter((task) => task.status === "QUEUED");

    // Собираем все базовые источники + любые новые, если они появятся в задачах
    const sourceMap = new Map(
        KNOWN_SOURCES.map((src) => [src.id, src.name])
    );

    for (const task of tasks) {
        for (const srcId of task.sources) {
            if (!sourceMap.has(srcId)) {
                sourceMap.set(srcId, srcId);
            }
        }
    }

    for (const [sourceId, sourceName] of sourceMap.entries()) {
        const owners = runningTasks.filter((task) =>
            task.sources.includes(sourceId)
        );

        const waitingCount = queuedTasks.filter((task) =>
            task.sources.includes(sourceId)
        ).length;

        const isLocked = owners.length > 0;
        const row = document.createElement("tr");

        if (owners.length === 1) {
            row.dataset.taskId = owners[0].id;
            row.tabIndex = 0;
        }

        const ownerText = isLocked
            ? owners
                  .map((t) => {
                      const proc = PROCESS_NAMES[t.process_type] ?? t.process_type;
                      return `${proc} (#${t.id.slice(0, 8)})`;
                  })
                  .join(", ")
            : "—";

        const waitingText = waitingCount > 0 ? `${waitingCount}` : "0";

        row.append(
            createCell(sourceName),
            createStatusCell(isLocked),
            createCell(ownerText),
            createCell(waitingText, "resource-waiting-count")
        );

        table.appendChild(row);
    }
}


function isResourcesPageActive() {
    const table = document.getElementById("resources-table");
    return Boolean(table && !document.hidden && table.offsetParent !== null);
}

function scheduleResourcesRefresh() {
    clearTimeout(resourcesTimer);
    resourcesTimer = setTimeout(async () => {
        if (isResourcesPageActive()) {
            try {
                await loadResources();
            } catch {}
        } else {
            scheduleResourcesRefresh();
        }
    }, RESOURCES_POLL_MS);
}

export async function loadResources() {
    if (isResourcesLoading) return;

    const message = document.getElementById("resources-message");
    isResourcesLoading = true;

    try {
        const tasks = await getTasks();
        renderResourcesTable(tasks);

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
        isResourcesLoading = false;
        scheduleResourcesRefresh();
    }
}
