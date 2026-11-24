
import { loadDashboard } from "./dashboard.js";
import { loadQueue } from "./queue.js";
import "./builder.js";

const PAGE_NAMES = {
    dashboard: "Dashboard",
    builder: "Task Builder",
    queue: "Queue",
    history: "History",
    resources: "Resources"
};

// Навигация

function showPage(pageName) {
    const targetPage = document.getElementById(
        `page-${pageName}`
    );

    if (!targetPage) {
        return;
    }

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    targetPage.classList.add("active");

    document.getElementById("current-page").textContent =
        PAGE_NAMES[pageName];

    if (pageName === "dashboard") {
        refreshDashboard();
    }
    if (pageName === "queue") {
    refreshQueue();
    }
}

// Обработчики навигации

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        showPage(item.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

// Состояние подключения

function setConnection(online) {
    const dot = document.getElementById("connection-dot");
    const text = document.getElementById("connection-text");

    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);

    text.textContent = online
        ? "API connected"
        : "API unavailable";
}

// Обновление Dashboard

async function refreshDashboard() {
    try {
        await loadDashboard();
        setConnection(true);

    } catch (error) {
        setConnection(false);
        console.error(error);
    }
}

async function refreshQueue() {
    try {
        await loadQueue();
        setConnection(true);

    } catch (error) {
        setConnection(false);
        console.error(error);
    }
}

// События приложения

document.addEventListener(
    "task:created",
    refreshDashboard
);

// Ручное обновление

document.getElementById("refresh-button")
    .addEventListener("click", refreshDashboard);


document.getElementById("queue-refresh")
    .addEventListener("click", refreshQueue);
    
// Инициализация приложения

showPage("dashboard");
