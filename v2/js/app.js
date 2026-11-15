
/* =========================================
   TASKFLOW 2.0 — APPLICATION ENGINE
   Built by Ajay Dhangar
========================================= */

"use strict";

/* =========================================
   CONFIGURATION & STATE
========================================= */

const STORAGE_KEY = "taskflow_v2_data";
const SETTINGS_KEY = "taskflow_v2_settings";
const APP_VERSION = "2.0.0";


/* =========================================
   CHECKLIST CHECKBOX EVENTS
========================================= */

document.addEventListener("change", event => {
  const checkbox = event.target.closest(
    '[data-action="subtask-toggle"]'
  );

  if (!checkbox) return;

  toggleSubtask(
    state.currentTaskId,
    checkbox.dataset.itemId,
    checkbox.checked
  );
});


const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const state = {
  tasks: [],
  settings: {
    theme: "light",
    mode: "light",
    userName: "Ajay"
  },
  currentView: "dashboard",
  currentTaskId: null,
  currentCategory: null,
  filter: "all",
  search: "",
  sort: "newest"
};

/* =========================================
   UTILITIES
========================================= */

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function todayString() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function formatDate(value) {
  if (!value) return "No deadline";

  const date = new Date(value + "T00:00:00");

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTimestamp(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function priorityRank(priority) {
  return {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  }[priority] || 0;
}

function getProgress(task) {
  const items = task.items || [];

  if (!items.length) {
    return task.completed ? 100 : 0;
  }

  const completed = items.filter(item => item.completed).length;

  return Math.round((completed / items.length) * 100);
}

function isTaskComplete(task) {
  return Boolean(task.completed);
}

function getCounts() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(isTaskComplete).length;
  const active = total - completed;

  return {
    total,
    completed,
    active,
    percentage: total
      ? Math.round((completed / total) * 100)
      : 0
  };
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

/* =========================================
   STORAGE
========================================= */

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (error) {
    console.error("Storage error:", error);
    showToast("Unable to save data. Check browser storage.", "error");
  }
}

function loadData() {
  const tasks = safeParse(localStorage.getItem(STORAGE_KEY), []);
  const settings = safeParse(localStorage.getItem(SETTINGS_KEY), {});

  state.tasks = Array.isArray(tasks)
    ? tasks.filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string"
      ).map(task => ({
        ...task,
        items: Array.isArray(task.items) ? task.items : [],
        completed: Boolean(task.completed),
        priority: ["low", "medium", "high", "urgent"].includes(task.priority)
          ? task.priority
          : "medium",
        category: ["Personal", "Work", "Study", "Other"].includes(task.category)
          ? task.category
          : "Other"
      }))
    : [];

  state.settings = {
    ...state.settings,
    ...settings
  };

  if (!["light", "dark", "ocean", "forest", "sunset"].includes(state.settings.theme)) {
    state.settings.theme = "light";
  }

  state.settings.mode = state.settings.mode === "dark" ? "dark" : "light";
}

/* =========================================
   TOAST NOTIFICATIONS
========================================= */

function showToast(message, type = "success") {
  const container = $("#toastContainer");
  const toast = document.createElement("div");

  const icons = {
    success: "check-circle",
    error: "alert-circle",
    info: "info"
  };

  toast.className = `toast ${type}`;

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", icons[type] || icons.info);

  const text = document.createElement("span");
  text.textContent = message;

  toast.append(icon, text);
  container.appendChild(toast);

  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";

    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/* =========================================
   ICONS
========================================= */

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* =========================================
   THEME SYSTEM
========================================= */

function applyTheme() {
  const root = document.documentElement;

  root.dataset.theme = state.settings.theme;
  root.dataset.mode = state.settings.mode;

  const themeColor = getComputedStyle(root)
    .getPropertyValue("--primary")
    .trim();

  $('meta[name="theme-color"]')
    ?.setAttribute("content", themeColor || "#6366f1");

  $$(".theme-option").forEach(button => {
    const selected =
      button.dataset.theme === state.settings.theme;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  saveData();
}

function setTheme(theme) {
  const allowed = ["light", "dark", "ocean", "forest", "sunset"];

  if (!allowed.includes(theme)) return;

  if (theme === "light" || theme === "dark") {
    state.settings.theme = theme;
    state.settings.mode = theme;
  } else {
    state.settings.theme = theme;
  }

  applyTheme();
  render();
  showToast(`${theme[0].toUpperCase() + theme.slice(1)} theme activated.`);
}

function toggleMode() {
  state.settings.mode =
    state.settings.mode === "dark" ? "light" : "dark";

  applyTheme();
  render();
}

/* =========================================
   NAVIGATION
========================================= */

const viewTitles = {
  dashboard: "Dashboard",
  tasks: "All Tasks",
  today: "Today's Tasks",
  upcoming: "Upcoming Tasks",
  completed: "Completed Tasks",
  category: "Category",
  details: "Task Details",
  settings: "Settings"
};

function navigate(view) {
  const allowed = Object.keys(viewTitles);

  if (!allowed.includes(view)) return;

  state.currentView = view;

  $$(".view").forEach(section => {
    section.classList.toggle("active", section.id === `${view}View`);
  });

  $$(".nav-item[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  $("#pageTitle").textContent = viewTitles[view];

  closeSidebar();
  render();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCategory(category) {
  state.currentCategory = category;
  $("#categoryTitle").textContent = `${category} Tasks`;
  navigate("category");
}

function openTaskDetails(id) {
  const task = findTask(id);

  if (!task) return;

  state.currentTaskId = id;
  navigate("details");
}

/* =========================================
   TASK HELPERS
========================================= */

function findTask(id) {
  return state.tasks.find(task => task.id === id);
}

function createTask(data) {
  const now = Date.now();

  const task = {
    id: uid(),
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    priority: data.priority,
    dueDate: data.dueDate || "",
    completed: false,
    items: [],
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  state.tasks.unshift(task);

  saveData();
  render();

  showToast("Task created successfully!");
  navigate("details");
  state.currentTaskId = task.id;
  renderDetails();
}

function updateTask(id, data) {
  const task = findTask(id);

  if (!task) return;

  Object.assign(task, {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    priority: data.priority,
    dueDate: data.dueDate || "",
    updatedAt: Date.now()
  });

  saveData();
  render();
  showToast("Task updated successfully!");
}

function deleteTask(id) {
  const index = state.tasks.findIndex(task => task.id === id);

  if (index === -1) return;

  state.tasks.splice(index, 1);

  saveData();
  render();

  showToast("Task deleted successfully.");
  navigate("tasks");
}

function toggleTask(id) {
  const task = findTask(id);

  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  task.updatedAt = Date.now();

  if (task.completed) {
    task.items.forEach(item => {
      item.completed = true;
    });
  }

  saveData();
  render();

  showToast(
    task.completed
      ? "Congratulations! Task completed 🎉"
      : "Task marked as active.",
    "success"
  );
}

/* =========================================
   TASK DIALOG
========================================= */

function openTaskDialog(id = null) {
  const form = $("#taskForm");

  form.reset();

  const task = id ? findTask(id) : null;

  $("#taskId").value = task?.id || "";
  $("#taskTitle").value = task?.title || "";
  $("#taskDescription").value = task?.description || "";
  $("#taskCategory").value = task?.category || "Personal";
  $("#taskPriority").value = task?.priority || "medium";
  $("#taskDueDate").value = task?.dueDate || "";

  $("#taskDialogTitle").textContent =
    task ? "Edit Task" : "Create New Task";

  $("#saveTaskBtn").textContent =
    task ? "Save Changes" : "Create Task";

  openDialog("taskDialog");

  setTimeout(() => $("#taskTitle").focus(), 100);
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const data = {
    title: $("#taskTitle").value,
    description: $("#taskDescription").value,
    category: $("#taskCategory").value,
    priority: $("#taskPriority").value,
    dueDate: $("#taskDueDate").value
  };

  if (!data.title.trim()) {
    showToast("Please enter a task title.", "error");
    return;
  }

  const id = $("#taskId").value;

  if (id) {
    updateTask(id, data);
  } else {
    createTask(data);
  }

  closeDialog("taskDialog");
}

/* =========================================
   SUBTASK / CHECKLIST SYSTEM
========================================= */

function openSubtaskDialog(taskId, itemId = null) {
  const task = findTask(taskId);

  if (!task) return;

  const item = itemId
    ? task.items.find(entry => entry.id === itemId)
    : null;

  $("#subtaskId").value = item?.id || "";
  $("#subtaskTitle").value = item?.title || "";

  $("#subtaskDialogTitle").textContent =
    item ? "Edit Checklist Item" : "Add Checklist Item";

  openDialog("subtaskDialog");

  $("#subtaskForm").dataset.taskId = taskId;

  setTimeout(() => $("#subtaskTitle").focus(), 100);
}

function handleSubtaskSubmit(event) {
  event.preventDefault();

  const taskId = event.currentTarget.dataset.taskId;
  const task = findTask(taskId);

  if (!task) return;

  const title = $("#subtaskTitle").value.trim();
  const itemId = $("#subtaskId").value;

  if (!title) {
    showToast("Please enter an item title.", "error");
    return;
  }

  if (itemId) {
    const item = task.items.find(entry => entry.id === itemId);

    if (item) item.title = title;
  } else {
    task.items.push({
      id: uid(),
      title,
      completed: false,
      createdAt: Date.now()
    });
  }

  task.completed = false;
  task.completedAt = null;
  task.updatedAt = Date.now();

  saveData();
  closeDialog("subtaskDialog");
  renderDetails();

  showToast(itemId ? "Checklist item updated." : "Checklist item added.");
}

function toggleSubtask(taskId, itemId, checked) {
  const task = findTask(taskId);

  if (!task) return;

  const item = task.items.find(entry => entry.id === itemId);

  if (!item) return;

  item.completed = checked;

  if (task.items.length && task.items.every(entry => entry.completed)) {
    task.completed = true;
    task.completedAt = Date.now();
  } else {
    task.completed = false;
    task.completedAt = null;
  }

  task.updatedAt = Date.now();

  saveData();
  render();
  renderDetails();
}

function deleteSubtask(taskId, itemId) {
  const task = findTask(taskId);

  if (!task) return;

  task.items = task.items.filter(item => item.id !== itemId);
  task.completed = false;
  task.completedAt = null;
  task.updatedAt = Date.now();

  saveData();
  renderDetails();
  render();
  showToast("Checklist item deleted.");
}

/* =========================================
   CONFIRMATION DIALOG
========================================= */

let confirmCallback = null;

function confirmAction({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  label = "Delete",
  callback
}) {
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmAction").textContent = label;

  confirmCallback = callback;

  openDialog("confirmDialog");
}

$("#confirmAction").addEventListener("click", () => {
  const callback = confirmCallback;
  confirmCallback = null;

  closeDialog("confirmDialog");

  if (typeof callback === "function") {
    callback();
  }
});

$("#confirmCancel").addEventListener("click", () => {
  confirmCallback = null;
  closeDialog("confirmDialog");
});

/* =========================================
   DIALOG HELPERS
========================================= */

function openDialog(id) {
  const dialog = document.getElementById(id);

  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function closeDialog(id) {
  const dialog = document.getElementById(id);

  if (dialog?.open) {
    dialog.close();
  }
}

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeDialog(button.dataset.close);
  });
});

$$("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

/* =========================================
   TASK CARD COMPONENT
========================================= */

function createTaskCard(task) {
  const progress = getProgress(task);
  const items = task.items || [];
  const completedItems = items.filter(item => item.completed).length;

  const dueLabel = task.dueDate
    ? formatDate(task.dueDate)
    : "No deadline";

  const overdue =
    task.dueDate &&
    task.dueDate < todayString() &&
    !task.completed;

  const article = document.createElement("article");

  article.className = `task-card ${task.completed ? "completed" : ""}`;
  article.dataset.id = task.id;
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `Open task: ${task.title}`);

  article.innerHTML = `
    <div class="task-card-top">
      <span class="task-category">${escapeHTML(task.category)}</span>
      <span class="priority-badge priority-${task.priority}">
        ${escapeHTML(task.priority)}
      </span>
    </div>

    <div style="display:flex;align-items:flex-start;gap:10px;">
      <button
        class="complete-check ${task.completed ? "checked" : ""}"
        data-action="complete"
        aria-label="${task.completed ? "Reopen" : "Complete"} task"
        aria-pressed="${task.completed}"
        title="Toggle completion"
      >
        ${task.completed ? '<i data-lucide="check"></i>' : ""}
      </button>

      <div style="min-width:0;flex:1;">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
      </div>
    </div>

    ${task.description
      ? `<p class="task-description">${escapeHTML(task.description)}</p>`
      : ""
    }

    <div class="task-progress-label">
      <span>Checklist progress</span>
      <strong>${progress}%</strong>
    </div>

    <div class="task-mini-progress">
      <span style="width:${progress}%"></span>
    </div>

    <div class="task-card-footer">
      <span>
        <i data-lucide="list-checks"></i>
        ${completedItems}/${items.length} items
      </span>

      <span style="${overdue ? "color:var(--red)" : ""}">
        <i data-lucide="calendar"></i>
        ${escapeHTML(dueLabel)}
      </span>
    </div>
  `;

  return article;
}

function renderTaskGrid(containerId, tasks, emptyTitle, emptyText) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("div");

    empty.className = "empty-state";

    empty.innerHTML = `
      <div class="empty-illustration">
        <i data-lucide="clipboard-check"></i>
      </div>

      <h3>${escapeHTML(emptyTitle)}</h3>
      <p>${escapeHTML(emptyText)}</p>

      <button class="primary-btn" data-action="add">
        <i data-lucide="plus"></i>
        Create New Task
      </button>
    `;

    container.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    container.appendChild(createTaskCard(task));
  });
}

/* =========================================
   FILTERING AND SORTING
========================================= */

function sortTasks(tasks) {
  const sorted = [...tasks];

  switch (state.sort) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);

    case "priority":
      return sorted.sort(
        (a, b) => priorityRank(b.priority) - priorityRank(a.priority)
      );

    case "dueDate":
      return sorted.sort((a, b) =>
        (a.dueDate || "9999-12-31").localeCompare(
          b.dueDate || "9999-12-31"
        )
      );

    case "alphabetical":
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title)
      );

    default:
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function getFilteredTasks(tasks, filter = state.filter) {
  let result = [...tasks];

  if (filter === "active") {
    result = result.filter(task => !task.completed);
  }

  if (filter === "completed") {
    result = result.filter(task => task.completed);
  }

  if (state.search.trim()) {
    const query = state.search.toLowerCase();

    result = result.filter(task =>
      [
        task.title,
        task.description,
        task.category,
        task.priority,
        ...(task.items || []).map(item => item.title)
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  return sortTasks(result);
}

/* =========================================
   DASHBOARD
========================================= */

function renderDashboard() {
  const counts = getCounts();

  $("#totalStat").textContent = counts.total;
  $("#activeStat").textContent = counts.active;
  $("#completedStat").textContent = counts.completed;
  $("#completionStat").textContent = `${counts.percentage}%`;

  $("#progressPercent").textContent = `${counts.percentage}%`;

  $("#overallProgress").style.width =
    `${counts.percentage}%`;

  $("#progressText").textContent =
    `${counts.completed} of ${counts.total} tasks completed`;

  $("#allCount").textContent = counts.total;

  const recent = sortTasks(state.tasks).slice(0, 4);

  renderTaskGrid(
    "dashboardTasks",
    getFilteredTasks(recent),
    "Your workspace is ready!",
    "You don't have any tasks yet. Start with a small goal and build momentum."
  );

  $("#welcomeTitle").textContent =
    `Welcome back, ${state.settings.userName || "there"}! 👋`;
}

/* =========================================
   TASK LIST VIEWS
========================================= */

function renderTasks() {
  const filtered = getFilteredTasks(state.tasks);

  renderTaskGrid(
    "allTasksGrid",
    filtered,
    "No tasks found",
    state.search
      ? "Try a different search term."
      : "Create your first task and organize your day."
  );

  $$(".filter-tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === state.filter
    );
  });
}

function renderToday() {
  const today = todayString();

  const tasks = state.tasks.filter(task =>
    task.dueDate === today && !task.completed
  );

  renderTaskGrid(
    "todayTasks",
    getFilteredTasks(tasks, "all"),
    "Nothing scheduled for today!",
    "Enjoy your free time or add a task to get started."
  );
}

function renderUpcoming() {
  const today = todayString();

  const tasks = state.tasks.filter(task =>
    task.dueDate &&
    task.dueDate > today &&
    !task.completed
  );

  renderTaskGrid(
    "upcomingTasks",
    getFilteredTasks(tasks, "all"),
    "No upcoming tasks",
    "Tasks with future deadlines will appear here."
  );
}

function renderCompleted() {
  const tasks = state.tasks.filter(task => task.completed);

  renderTaskGrid(
    "completedTasks",
    getFilteredTasks(tasks, "all"),
    "No completed tasks yet",
    "Your achievements will appear here."
  );
}

function renderCategory() {
  const tasks = state.tasks.filter(task =>
    task.category === state.currentCategory
  );

  renderTaskGrid(
    "categoryTasks",
    getFilteredTasks(tasks, "all"),
    "No tasks in this category",
    `Add a ${state.currentCategory.toLowerCase()} task to get started.`
  );
}

/* =========================================
   TASK DETAIL PAGE
========================================= */

function renderDetails() {
  const task = findTask(state.currentTaskId);
  const container = $("#taskDetailsContent");

  if (!task) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Task not found</h3>
        <p>This task may have been deleted.</p>
      </div>
    `;
    return;
  }

  const progress = getProgress(task);
  const completedItems = task.items.filter(item => item.completed).length;

  const checklistHTML = task.items.length
    ? task.items.map(item => `
      <div class="checklist-item ${item.completed ? "done" : ""}">
        <input
          type="checkbox"
          data-action="subtask-toggle"
          data-item-id="${escapeHTML(item.id)}"
          ${item.completed ? "checked" : ""}
          aria-label="Complete ${escapeHTML(item.title)}"
        />

        <span>${escapeHTML(item.title)}</span>

        <div class="checklist-actions">
          <button
            data-action="subtask-edit"
            data-item-id="${escapeHTML(item.id)}"
            aria-label="Edit item"
            title="Edit"
          >
            <i data-lucide="pencil"></i>
          </button>

          <button
            data-action="subtask-delete"
            data-item-id="${escapeHTML(item.id)}"
            aria-label="Delete item"
            title="Delete"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join("")
    : `
      <div class="empty-state" style="min-height:160px;">
        <div class="empty-illustration">
          <i data-lucide="list-checks"></i>
        </div>
        <h3>No checklist items</h3>
        <p>Break this task into smaller steps.</p>
      </div>
    `;

  container.innerHTML = `
    <article class="detail-card">

      <div class="task-card-top">
        <span class="task-category">${escapeHTML(task.category)}</span>

        <span class="priority-badge priority-${task.priority}">
          ${escapeHTML(task.priority)} priority
        </span>
      </div>

      <h2>${escapeHTML(task.title)}</h2>

      <p class="detail-description">
        ${escapeHTML(task.description || "No description added for this task.")}
      </p>

      <div class="detail-meta">
        <div class="meta-box">
          <span>Status</span>
          <strong>${task.completed ? "Completed" : "In Progress"}</strong>
        </div>

        <div class="meta-box">
          <span>Due Date</span>
          <strong>${escapeHTML(formatDate(task.dueDate))}</strong>
        </div>

        <div class="meta-box">
          <span>Created</span>
          <strong>${escapeHTML(formatTimestamp(task.createdAt))}</strong>
        </div>
      </div>

      <div class="detail-progress">
        <div class="section-heading">
          <div>
            <h3>Task Progress</h3>
            <p>${completedItems} of ${task.items.length} steps completed</p>
          </div>
          <strong>${progress}%</strong>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>

      <div class="checklist-header">
        <h3>Checklist / Subtasks</h3>

        <button class="primary-btn" data-action="add-subtask">
          <i data-lucide="plus"></i>
          Add Item
        </button>
      </div>

      <div class="checklist-list">
        ${checklistHTML}
      </div>

      <div style="margin-top:25px;">
        <button
          class="${task.completed ? "secondary-btn" : "primary-btn"}"
          data-action="complete"
          style="width:100%;"
        >
          <i data-lucide="${task.completed ? "refresh-ccw" : "check-circle"}"></i>
          ${task.completed ? "Mark as Active" : "Mark Task as Complete"}
        </button>
      </div>

    </article>
  `;
}

/* =========================================
   GLOBAL RENDER
========================================= */

function render() {
  renderDashboard();

  if (state.currentView === "tasks") renderTasks();
  if (state.currentView === "today") renderToday();
  if (state.currentView === "upcoming") renderUpcoming();
  if (state.currentView === "completed") renderCompleted();
  if (state.currentView === "category") renderCategory();
  if (state.currentView === "details") renderDetails();

  refreshIcons();
}

/* =========================================
   EVENT DELEGATION
========================================= */

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  const navButton = event.target.closest("[data-view]");
  const categoryButton = event.target.closest("[data-category]");
  const themeButton = event.target.closest("[data-theme]");

  if (themeButton) {
    setTheme(themeButton.dataset.theme);
    return;
  }

  if (categoryButton) {
    openCategory(categoryButton.dataset.category);
    return;
  }

  if (navButton) {
    navigate(navButton.dataset.view);
    return;
  }

  if (!actionButton) {
    const card = event.target.closest(".task-card");

    if (card) {
      openTaskDetails(card.dataset.id);
    }

    return;
  }

  const action = actionButton.dataset.action;
  const card = actionButton.closest(".task-card");

  const taskId =
    card?.dataset.id || state.currentTaskId;

  const itemId = actionButton.dataset.itemId;

  if (action === "add") {
    openTaskDialog();
  }

  if (action === "complete") {
    toggleTask(taskId);
  }

  if (action === "add-subtask") {
    openSubtaskDialog(taskId);
  }

  if (action === "subtask-edit") {
    openSubtaskDialog(taskId, itemId);
  }

  if (action === "subtask-delete") {
    confirmAction({
      title: "Delete checklist item?",
      message: "This checklist item will be permanently deleted.",
      callback: () => deleteSubtask(taskId, itemId)
    });
  }
});

document.addEventListener("keydown", event => {
  const card = event.target.closest?.(".task-card");

  if (
    card &&
    (event.key === "Enter" || event.key === " ") &&
    event.target === card
  ) {
    event.preventDefault();
    openTaskDetails(card.dataset.id);
  }
});

/* =========================================
   FORM EVENTS
========================================= */

$("#taskForm").addEventListener("submit", handleTaskSubmit);

$("#subtaskForm").addEventListener("submit", handleSubtaskSubmit);

/* =========================================
   BUTTON EVENTS
========================================= */

$("#addTaskBtn").addEventListener("click", () => openTaskDialog());
$("#addTaskBtn2").addEventListener("click", () => openTaskDialog());

$("#backBtn").addEventListener("click", () => {
  navigate("tasks");
});

$("#editTaskBtn").addEventListener("click", () => {
  openTaskDialog(state.currentTaskId);
});

$("#deleteTaskBtn").addEventListener("click", () => {
  const task = findTask(state.currentTaskId);

  if (!task) return;

  confirmAction({
    title: "Delete this task?",
    message: `Are you sure you want to delete "${task.title}"?`,
    callback: () => deleteTask(task.id)
  });
});

$("#settingsBtn").addEventListener("click", () => {
  $("#userNameInput").value = state.settings.userName || "";
  navigate("settings");
});

$("#themeQuickBtn").addEventListener("click", () => {
  openDialog("themeDialog");
});

$("#saveProfileBtn").addEventListener("click", () => {
  const name = $("#userNameInput").value.trim();

  if (!name) {
    showToast("Please enter your name.", "error");
    return;
  }

  state.settings.userName = name.slice(0, 40);

  saveData();
  render();

  showToast("Profile updated!");
});

$("#clearDataBtn").addEventListener("click", () => {
  confirmAction({
    title: "Clear all application data?",
    message: "All your tasks, checklist items and saved settings will be permanently deleted.",
    label: "Clear Everything",
    callback: () => {
      state.tasks = [];

      localStorage.removeItem(STORAGE_KEY);

      saveData();
      navigate("dashboard");

      showToast("All tasks have been cleared.");
    }
  });
});

/* =========================================
   SEARCH
========================================= */

$("#searchInput").addEventListener("input", event => {
  state.search = event.target.value;

  render();
});

$$(".filter-tab").forEach(button => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    renderTasks();
    refreshIcons();
  });
});

$("#sortSelect").addEventListener("change", event => {
  state.sort = event.target.value;
  renderTasks();
  refreshIcons();
});

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener("keydown", event => {
  const active = document.activeElement;
  const typing = active.matches(
    "input, textarea, select, [contenteditable='true']"
  );

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#searchInput").focus();
  }

  if (!typing && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openTaskDialog();
  }

  if (event.key === "Escape") {
    closeSidebar();
  }
});

/* =========================================
   SIDEBAR / MOBILE NAVIGATION
========================================= */

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("show");
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("show");
}

$("#menuBtn").addEventListener("click", openSidebar);

$("#sidebarOverlay").addEventListener("click", closeSidebar);

/* =========================================
   EXPORT TASK DATA
========================================= */

function exportData() {
  const backup = {
    app: "TaskFlow",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    tasks: state.tasks
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `taskflow-backup-${todayString()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Backup exported successfully!");
}

$("#exportBtn").addEventListener("click", exportData);

/* =========================================
   IMPORT TASK DATA
========================================= */

$("#importFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File is too large. Maximum size is 5 MB.");
    }

    const content = await file.text();
    const data = JSON.parse(content);

    if (
      !data ||
      !Array.isArray(data.tasks) ||
      data.tasks.length > 10000
    ) {
      throw new Error("Invalid TaskFlow backup.");
    }

    const imported = data.tasks.map(task => {
      if (
        !task ||
        typeof task.title !== "string" ||
        task.title.length > 100 ||
        !Array.isArray(task.items || [])
      ) {
        throw new Error("Backup contains an invalid task.");
      }

      return {
        id: uid(),
        title: task.title,
        description: String(task.description || "").slice(0, 1000),
        category: ["Personal", "Work", "Study", "Other"].includes(task.category)
          ? task.category
          : "Other",
        priority: ["low", "medium", "high", "urgent"].includes(task.priority)
          ? task.priority
          : "medium",
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || "")
          ? task.dueDate
          : "",
        completed: Boolean(task.completed),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: task.completed ? Date.now() : null,
        items: task.items.map(item => ({
          id: uid(),
          title: String(item.title || "").slice(0, 120),
          completed: Boolean(item.completed),
          createdAt: Date.now()
        }))
      };
    });

    confirmAction({
      title: "Import backup?",
      message: `This will replace your existing tasks with ${imported.length} imported tasks.`,
      label: "Import Data",
      callback: () => {
        state.tasks = imported;

        if (data.settings && typeof data.settings === "object") {
          const theme = data.settings.theme;
          const mode = data.settings.mode;

          if (["light", "dark", "ocean", "forest", "sunset"].includes(theme)) {
            state.settings.theme = theme;
          }

          if (["light", "dark"].includes(mode)) {
            state.settings.mode = mode;
          }

          if (typeof data.settings.userName === "string") {
            state.settings.userName =
              data.settings.userName.slice(0, 40);
          }
        }

        saveData();
        applyTheme();
        navigate("dashboard");

        showToast("Backup imported successfully!");
      }
    });

  } catch (error) {
    showToast(error.message || "Unable to import backup.", "error");
  } finally {
    event.target.value = "";
  }
});

/* =========================================
   PROFILE BUTTON
========================================= */

$("#profileBtn").addEventListener("click", () => {
  navigate("settings");
  $("#userNameInput").value = state.settings.userName || "";
  $("#userNameInput").focus();
});

/* =========================================
   DATE & GREETING
========================================= */

function renderDate() {
  $("#currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}

/* =========================================
   SERVICE WORKER
========================================= */

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (
    location.protocol !== "https:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.warn("Service worker registration failed:", error);
  }
}

/* =========================================
   APP INITIALIZATION
========================================= */

function initializeApp() {
  loadData();

  applyTheme();
  renderDate();

  $("#userNameInput").value =
    state.settings.userName || "";

  navigate("dashboard");

  registerServiceWorker();

  console.log(
    `%cTaskFlow v${APP_VERSION}`,
    "color:#6366f1;font-size:20px;font-weight:bold;"
  );

  console.log("TaskFlow initialized successfully.");
}

document.addEventListener("DOMContentLoaded", initializeApp);
