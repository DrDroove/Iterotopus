import { createTask } from "./api.js";

const RISK_TYPES = [
    {
        id: "credit",
        name: "Credit Risks",
        description: "Assess credit default risk",
        icon: "◇"
    },
    {
        id: "market",
        name: "Market Risks",
        description: "Analyze market risks",
        icon: "↗"
    },
    {
        id: "operational",
        name: "Operational Risks",
        description: "Evaluate operational risks",
        icon: "⚙"
    }
];

const DATA_SOURCES = [
    {
        id: "transactions",
        name: "Transactions",
        description: "User transactions and payments",
        icon: "▤"
    },
    {
        id: "market_data",
        name: "Market Data",
        description: "Market data and indicators",
        icon: "↗"
    }
];

const state = {
    risk: null,
    sources: new Set()
};

const form = document.getElementById("task-form");

const riskSlot = document.getElementById("risk-slot");
const sourcesSlot = document.getElementById("sources-slot");

const riskOptions = document.getElementById("risk-options");
const sourceOptions = document.getElementById("source-options");

const sourceLibrary = document.getElementById("source-library");

const riskSlotTitle = document.getElementById("risk-slot-title");
const sourcesSlotTitle = document.getElementById("sources-slot-title");

const previewRisk = document.getElementById("preview-risk");
const previewSources = document.getElementById("preview-sources");

const riskCheck = document.getElementById("risk-check");
const sourcesCheck = document.getElementById("sources-check");


function renderBuilder() {
    const selectedRisk = RISK_TYPES.find(
        risk => risk.id === state.risk
    );

    const selectedSources = DATA_SOURCES.filter(
        source => state.sources.has(source.id)
    );

    const hasRisk = Boolean(selectedRisk);
    const hasSources = selectedSources.length > 0;

    const sourceNames = selectedSources
        .map(source => source.name)
        .join(", ");

    // Блок выбора риска

    riskSlotTitle.textContent = hasRisk
        ? selectedRisk.name
        : "Choose risk type";

    riskSlot.classList.toggle("filled", hasRisk);

    riskSlot.querySelector(".slot-icon").textContent =
        hasRisk ? "✓" : "+";

    // Блок выбора источников

    sourcesSlotTitle.textContent = hasSources
        ? sourceNames
        : "Select data sources";

    sourcesSlot.classList.toggle("filled", hasSources);

    sourcesSlot.querySelector(".slot-icon").textContent =
        hasSources ? "✓" : "+";

    // Предварительный просмотр

    previewRisk.textContent = hasRisk
        ? selectedRisk.name
        : "[risk type]";

    previewSources.textContent = hasSources
        ? sourceNames
        : "[data sources]";

    previewRisk.classList.toggle("selected", hasRisk);
    previewSources.classList.toggle("selected", hasSources);

    // Проверка конфигурации

    riskCheck.textContent = hasRisk
        ? "✓ Risk type selected"
        : "○ Risk type required";

    sourcesCheck.textContent = hasSources
        ? `✓ ${selectedSources.length} source(s) selected`
        : "○ Select data sources";

    riskCheck.classList.toggle("valid", hasRisk);
    sourcesCheck.classList.toggle("valid", hasSources);


    // Обновление карточек и вариантов выбора

    document.querySelectorAll("[data-source-id]")
        .forEach(element => {
            const selected = state.sources.has(
                element.dataset.sourceId
            );

            element.classList.toggle("selected", selected);

            element.setAttribute(
                "aria-pressed",
                String(selected)
            );
        });

    document.querySelectorAll("[data-risk-id]")
        .forEach(element => {
            const selected =
                element.dataset.riskId === state.risk;

            element.classList.toggle("selected", selected);

            element.setAttribute(
                "aria-pressed",
                String(selected)
            );
        });
}

function closeMenus() {
    riskOptions.hidden = true;
    sourceOptions.hidden = true;

    riskSlot.setAttribute("aria-expanded", "false");
    sourcesSlot.setAttribute("aria-expanded", "false");
}

function selectRisk(riskId) {
    state.risk = riskId;

    closeMenus();
    renderBuilder();
}

function createOption(item, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "builder-option";

    const icon = document.createElement("span");
    icon.className = "option-icon";
    icon.textContent = item.icon;

    const content = document.createElement("span");
    content.className = "option-content";

    const title = document.createElement("strong");
    title.textContent = item.name;

    const description = document.createElement("span");
    description.className = "option-description";
    description.textContent = item.description;

    content.append(title, description);

    const check = document.createElement("span");
    check.className = "option-check";
    check.textContent = "✓";

    button.append(icon, content, check);

    button.addEventListener("click", onClick);

    return button;
}

function renderRiskOptions() {
    riskOptions.replaceChildren();

    for (const risk of RISK_TYPES) {
        const button = createOption(
            risk,
            () => selectRisk(risk.id)
        );

        button.dataset.riskId = risk.id;

        riskOptions.appendChild(button);
    }
}

riskSlot.addEventListener("click", () => {
    const shouldOpen = riskOptions.hidden;

    closeMenus();

    riskOptions.hidden = !shouldOpen;

    riskSlot.setAttribute(
        "aria-expanded",
        String(shouldOpen)
    );
});

function toggleSource(sourceId) {
    if (state.sources.has(sourceId)) {
        state.sources.delete(sourceId);
    } else {
        state.sources.add(sourceId);
    }

    renderBuilder();
}

function renderSourceOptions() {
    sourceOptions.replaceChildren();

    for (const source of DATA_SOURCES) {
        const button = createOption(
            source,
            () => toggleSource(source.id)
        );

        button.dataset.sourceId = source.id;

        sourceOptions.appendChild(button);
    }

    const applyButton = document.createElement("button");

    applyButton.type = "button";
    applyButton.className = "primary-button";
    applyButton.textContent = "Apply";

    applyButton.addEventListener("click", closeMenus);

    sourceOptions.appendChild(applyButton);
}

sourcesSlot.addEventListener("click", () => {
    const shouldOpen = sourceOptions.hidden;

    closeMenus();

    sourceOptions.hidden = !shouldOpen;

    sourcesSlot.setAttribute(
        "aria-expanded",
        String(shouldOpen)
    );
});

function renderSourceLibrary() {
    sourceLibrary.replaceChildren();

    for (const source of DATA_SOURCES) {
        const card = document.createElement("button");

        card.type = "button";
        card.className = "source-card";
        card.dataset.sourceId = source.id;

        card.draggable = true;

        const icon = document.createElement("span");
        icon.className = "source-card-icon";
        icon.textContent = source.icon;

        const title = document.createElement("span");
        title.className = "source-card-title";
        title.textContent = source.name;

        const description = document.createElement("span");
        description.className = "source-card-description";
        description.textContent = source.description;

        card.append(icon, title, description);

        card.addEventListener("click", () => {
            toggleSource(source.id);
        });

        card.addEventListener("dragstart", event => {
            event.dataTransfer.setData(
                "text/plain",
                source.id
            );

            event.dataTransfer.effectAllowed = "copy";

            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            sourcesSlot.classList.remove("drag-over");
        });

        sourceLibrary.appendChild(card);
    }
}

sourcesSlot.addEventListener("dragover", event => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "copy";

    sourcesSlot.classList.add("drag-over");
});

sourcesSlot.addEventListener("dragleave", event => {
    if (!sourcesSlot.contains(event.relatedTarget)) {
        sourcesSlot.classList.remove("drag-over");
    }
});

sourcesSlot.addEventListener("drop", event => {
    event.preventDefault();

    sourcesSlot.classList.remove("drag-over");

    const sourceId = event.dataTransfer.getData(
        "text/plain"
    );

    const isValidSource = DATA_SOURCES.some(
        source => source.id === sourceId
    );

    if (!isValidSource) {
        return;
    }

    state.sources.add(sourceId);

    renderBuilder();
});


document.getElementById("reset-builder")
    .addEventListener("click", () => {
        form.reset();

        document.getElementById("message").textContent = "";
    });

form.addEventListener("reset", () => {
    state.risk = null;
    state.sources.clear();

    closeMenus();

    queueMicrotask(renderBuilder);
});

// Закрытие меню при клике вне конструктора

document.addEventListener("click", event => {
    if (
        !riskSlot.contains(event.target) &&
        !sourcesSlot.contains(event.target) &&
        !riskOptions.contains(event.target) &&
        !sourceOptions.contains(event.target)
    ) {
        closeMenus();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMenus();
    }
});

const message = document.getElementById("message");

const submitButton = document.querySelector(
    'button[type="submit"][form="task-form"]'
);

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function buildTaskData() {
    return {
        process_type: state.risk,

        business_date:
            document.getElementById("business-date").value,

        sources: [...state.sources],


        trigger_type:
            document.getElementById("trigger-type").value
    };
}

function validateTask(data) {
    if (!RISK_TYPES.some(risk => risk.id === data.process_type)) {
        throw new Error("Выберите тип риска");
    }

    if (data.sources.length === 0) {
        throw new Error("Выберите хотя бы один источник");
    }

    if (!data.business_date) {
        throw new Error("Укажите расчётную дату");
    }

}

form.addEventListener("submit", async event => {
    event.preventDefault();

    if (submitButton.disabled) {
        return;
    }

    try {
        const data = buildTaskData();

        validateTask(data);

        submitButton.disabled = true;
        submitButton.textContent = "Creating...";

        await createTask(data);

        form.reset();

        showMessage(
            "Задача успешно создана!",
            "success"
        );

        document.dispatchEvent(
            new CustomEvent("task:created")
        );

    } catch (error) {
        showMessage(error.message, "error");

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create Task";
    }
});

// Первоначальная настройка

riskSlot.setAttribute("aria-controls", "risk-options");
sourcesSlot.setAttribute("aria-controls", "source-options");

closeMenus();

renderRiskOptions();
renderSourceOptions();
renderSourceLibrary();
renderBuilder();