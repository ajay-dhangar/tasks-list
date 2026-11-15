
/* =========================================
   TASKFLOW — SMART TO-DO MANAGER
   Version: 1.0.0
   Vanilla JavaScript
========================================= */

(() => {
  "use strict";

  /* =======================================
     CONFIGURATION
  ======================================= */

  const STORAGE_KEY = "taskflow.tasks.v1";
  const SETTINGS_KEY = "taskflow.settings.v1";

  const $ = (selector, scope = document) =>
    scope.querySelector(selector);

  const $$ = (selector, scope = document) =>
    [...scope.querySelectorAll(selector)];

  const uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const today = () => {
    const date = new Date();
    const local = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 10);
  };

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  /* =======================================
     APPLICATION STATE
  ======================================= */

  let tasks = readStorage(STORAGE_KEY, []);

  if (!Array.isArray(tasks)) {
    tasks = [];
  }

  let settings = {
    mode: "dark",
    accent: "violet",
    ...readStorage(SETTINGS_KEY, {})
  };

  const allowedModes = ["dark", "light", "system"];
  const allowedAccents = [
    "violet", "blue", "green", "orange", "pink"
  ];

  if (!allowedModes.includes(settings.mode)) {
    settings.mode = "dark";
  }

  if (!allowedAccents.includes(settings.accent)) {
    settings.accent = "violet";
  }

  let currentFilter = "all";
  let currentTaskId = null;
  let deleteTargetId = null;
  let activeModal = null;
  let previousFocus = null;

  /* =======================================
     STORAGE
  ======================================= */

  function saveTasks() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tasks)
      );
      return true;
    } catch (error) {
      console.error("Storage error:", error);
      notify(
        "Could not save your changes. Browser storage may be full.",
        "error"
      );
      return false;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Settings storage error:", error);
      notify("Could not save your preferences.", "error");
    }
  }

  function getTask(id) {
    return tasks.find(task => task.id === id);
  }

  /* =======================================
     TASK UTILITIES
  ======================================= */

  function getDoneCount(task) {
    return (task.items || []).filter(item => item.done).length;
  }

  function getProgress(task) {
    const items = task.items || [];

    if (items.length === 0) {
      return task.completed ? 100 : 0;
    }

    return Math.round(
      (getDoneCount(task) / items.length) * 100
    );
  }

  function isCompleted(task) {
    return Boolean(task.completed);
  }

  function isOverdue(task) {
    return Boolean(
      task.due &&
      task.due < today() &&
      !isCompleted(task)
    );
  }

  function formatDate(value) {
    if (!value) return "No due date";

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function categoryColor(task) {
    return `card-accent-${task.color || "violet"}`;
  }

  /* =======================================
     NOTIFICATIONS
  ======================================= */

  function notify(message, type = "success") {
    const toast = document.createElement("div");

    toast.className =
      `toast ${type === "error" ? "error" : ""}`;

    const icon = document.createElement("span");
    icon.className = "toast-mark";
    icon.textContent = type === "error" ? "!" : "✓";

    const text = document.createElement("span");
    text.textContent = message;

    toast.append(icon, text);
    $("#toastRegion").appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  /* =======================================
     THEME SYSTEM
  ======================================= */

  function applyAppearance() {
    let activeTheme = settings.mode;

    if (activeTheme === "system") {
      activeTheme = window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches ? "light" : "dark";
    }

    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.dataset.accent =
      settings.accent;

    $$(".mode-option").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.mode === settings.mode
      );
    });

    $$(".swatch").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.accent === settings.accent
      );
    });
  }

  function toggleTheme() {
    settings.mode =
      settings.mode === "dark" ? "light" : "dark";

    saveSettings();
    applyAppearance();
  }

  /* =======================================
     MODAL SYSTEM
  ======================================= */

  function openModal(id) {
    const modal = $(`#${id}`);

    if (!modal) return;

    previousFocus = document.activeElement;
    modal.hidden = false;
    activeModal = id;

    document.body.style.overflow = "hidden";

    const focusTarget = $(
      'input:not([type="hidden"]), textarea, button',
      modal
    );

    setTimeout(() => focusTarget?.focus(), 50);
  }

  function closeModal(id) {
    const modal = $(`#${id}`);

    if (!modal) return;

    modal.hidden = true;

    if (activeModal === id) {
      activeModal = null;
    }

    document.body.style.overflow = "";

    if (previousFocus?.isConnected) {
      previousFocus.focus();
    }
  }

  /* =======================================
     DASHBOARD STATISTICS
  ======================================= */

  function updateStatistics() {
    const total = tasks.length;

    const completed = tasks.filter(
      isCompleted
    ).length;

    const active = total - completed;

    const overdue = tasks.filter(
      isOverdue
    ).length;

    $("#allCount").textContent = total;
    $("#activeCount").textContent = active;
    $("#completedCount").textContent = completed;

    $("#totalTasks").textContent = total;
    $("#activeTasks").textContent = active;
    $("#completedTasks").textContent = completed;
    $("#overdueTasks").textContent = overdue;

    $("#allChip").textContent = total;
    $("#activeChip").textContent = active;
    $("#completedChip").textContent = completed;
    $("#overdueChip").textContent = overdue;

    const percentage = total
      ? Math.round((completed / total) * 100)
      : 0;

    $("#overallPercent").textContent =
      `${percentage}%`;

    $("#overallProgress").style.width =
      `${percentage}%`;

    $("#progressCount").textContent =
      `${completed} of ${total} tasks`;

    $("#progressMessage").textContent =
      total === 0
        ? "Your journey starts with one task."
        : percentage === 100
          ? "Amazing work — everything is complete!"
          : "Every small step moves you forward.";
  }

  /* =======================================
     TASK FILTERING AND SORTING
  ======================================= */

  function getVisibleTasks() {
    const query = $("#searchInput")
      .value.trim().toLowerCase();

    const filtered = tasks.filter(task => {
      const checklist = (task.items || [])
        .map(item => item.title)
        .join(" ");

      const searchable = [
        task.title,
        task.description,
        task.category,
        checklist
      ].join(" ").toLowerCase();

      const matchesSearch =
        searchable.includes(query);

      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "active" &&
          !isCompleted(task)) ||
        (currentFilter === "completed" &&
          isCompleted(task)) ||
        (currentFilter === "overdue" &&
          isOverdue(task));

      return matchesSearch && matchesFilter;
    });

    const sort = $("#sortSelect").value;

    filtered.sort((a, b) => {
      switch (sort) {
        case "due":
          return (
            (a.due || "9999-12-31")
              .localeCompare(b.due || "9999-12-31")
          );

        case "priority": {
          const priorities = {
            high: 0,
            medium: 1,
            low: 2
          };

          return priorities[a.priority] -
            priorities[b.priority];
        }

        case "title":
          return a.title.localeCompare(b.title);

        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }

  /* =======================================
     RENDER TASK CARDS
  ======================================= */

  function renderTasks() {
    updateStatistics();

    const grid = $("#taskGrid");
    const empty = $("#emptyState");
    const visibleTasks = getVisibleTasks();

    grid.innerHTML = "";

    grid.hidden = visibleTasks.length === 0;
    empty.hidden = visibleTasks.length > 0;

    if (visibleTasks.length === 0) {
      const hasTasks = tasks.length > 0;

      $("#emptyTitle").textContent = hasTasks
        ? "Nothing here right now."
        : "A fresh start. A world of possibilities.";

      $("#emptyMessage").textContent = hasTasks
        ? "Try another filter or search term, or create a new task."
        : "Your task list is clear. Add your first task and turn an idea into action.";

      $("#emptyAddButton").textContent = hasTasks
        ? "＋ Add a task"
        : "＋ Create your first task";

      return;
    }

    visibleTasks.forEach((task, index) => {
      const percentage = getProgress(task);
      const completed = isCompleted(task);
      const itemCount = (task.items || []).length;
      const doneCount = getDoneCount(task);

      const card = document.createElement("article");

      card.className =
        `task-card ${categoryColor(task)}` +
        (completed ? " is-completed" : "");

      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        `Open task: ${task.title}`
      );

      card.style.animationDelay = `${index * 40}ms`;

      const cardTop = document.createElement("div");
      cardTop.className = "card-top";

      cardTop.innerHTML = `
        <span class="category-pill">
          ${escapeHTML(task.category)}
        </span>

        <span class="priority ${escapeHTML(task.priority)}">
          <i></i>
          ${escapeHTML(task.priority.toUpperCase())}
        </span>
      `;

      const title = document.createElement("h3");
      title.textContent = task.title;

      const description = document.createElement("p");
      description.className = "task-description";
      description.textContent =
        task.description ||
        "No description added yet. Open this task to add details.";

      const progress = document.createElement("div");
      progress.className = "card-progress";

      progress.innerHTML = `
        <div class="card-progress-head">
          <span>Progress</span>
          <strong>${percentage}%</strong>
        </div>

        <div class="mini-track">
          <div class="mini-fill"
            style="width:${percentage}%">
          </div>
        </div>
      `;

      const bottom = document.createElement("div");
      bottom.className = "card-bottom";

      const meta = document.createElement("div");
      meta.className =
        "task-meta" + (isOverdue(task) ? " overdue" : "");

      meta.innerHTML = `
        <span>◷ ${escapeHTML(formatDate(task.due))}</span>
        <span>☷ ${doneCount}/${itemCount}</span>
      `;

      const completeButton = document.createElement("button");

      completeButton.className =
        "card-check" + (completed ? " checked" : "");

      completeButton.textContent = completed ? "✓" : "○";

      completeButton.title = completed
        ? "Mark as active"
        : "Complete task";

      completeButton.setAttribute(
        "aria-label",
        completeButton.title
      );

      completeButton.addEventListener("click", event => {
        event.stopPropagation();
        toggleTaskCompletion(task.id);
      });

      bottom.append(meta, completeButton);

      card.append(
        cardTop,
        title,
        description,
        progress,
        bottom
      );

      card.addEventListener("click", () => {
        openTaskDetails(task.id);
      });

      card.addEventListener("keydown", event => {
        if (event.target !== card) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTaskDetails(task.id);
        }
      });

      grid.appendChild(card);
    });
  }

  /* =======================================
     TASK CREATE / EDIT
  ======================================= */

  function openTaskModal(id = null) {
    const task = id ? getTask(id) : null;

    $("#taskForm").reset();

    $("#taskId").value = task?.id || "";

    $("#modalTitle").textContent = task
      ? "Edit your task"
      : "Create a task";

    $("#saveTaskButton").textContent = task
      ? "Save changes →"
      : "Create task →";

    $("#taskTitle").value = task?.title || "";
    $("#taskDescription").value =
      task?.description || "";

    $("#taskCategory").value =
      task?.category || "Personal";

    $("#taskPriority").value =
      task?.priority || "medium";

    $("#taskDue").value = task?.due || "";

    $("#taskColor").value =
      task?.color || "violet";

    // Prevent choosing a past date for new tasks.
    $("#taskDue").min = today();

    openModal("taskModal");
  }

  function saveTask(event) {
    event.preventDefault();

    const title = $("#taskTitle").value.trim();

    if (!title) {
      $("#taskTitle").focus();
      return;
    }

    const id = $("#taskId").value;
    const existing = id ? getTask(id) : null;

    const data = {
      title,
      description:
        $("#taskDescription").value.trim(),

      category: $("#taskCategory").value,
      priority: $("#taskPriority").value,
      due: $("#taskDue").value,
      color: $("#taskColor").value
    };

    if (existing) {
      Object.assign(existing, data);
      notify("Task details updated!");
    } else {
      tasks.unshift({
        id: uid(),
        ...data,
        items: [],
        completed: false,
        createdAt: Date.now()
      });

      notify("Your new task is ready. Let's do this!");
    }

    if (!saveTasks()) return;

    closeModal("taskModal");
    renderTasks();

    if (currentTaskId) {
      renderTaskDetails();
    }
  }

  /* =======================================
     COMPLETE / UNCOMPLETE TASK
  ======================================= */

  function toggleTaskCompletion(id) {
    const task = getTask(id);

    if (!task) return;

    task.completed = !task.completed;

    // When manually completing a task,
    // complete every checklist item too.
    if (task.completed) {
      task.items.forEach(item => {
        item.done = true;
      });
    } else {
      task.items.forEach(item => {
        item.done = false;
      });
    }

    saveTasks();
    renderTasks();

    if (currentTaskId === id) {
      renderTaskDetails();
    }

    notify(
      task.completed
        ? "Task completed successfully!"
        : "Task moved back to in progress."
    );
  }

  /* =======================================
     TASK DETAILS PAGE
  ======================================= */

  function openTaskDetails(id) {
    if (!getTask(id)) return;

    currentTaskId = id;

    $("#dashboardView").hidden = true;
    $("#detailView").hidden = false;

    $("#breadcrumbTitle").textContent =
      getTask(id).title;

    renderTaskDetails();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showDashboard() {
    $("#dashboardView").hidden = false;
    $("#detailView").hidden = true;

    $("#breadcrumbTitle").textContent = "Overview";

    currentTaskId = null;

    renderTasks();
  }

  function renderTaskDetails() {
    const task = getTask(currentTaskId);

    if (!task) {
      showDashboard();
      return;
    }

    const percentage = getProgress(task);
    const done = getDoneCount(task);
    const total = task.items.length;

    const detail = $("#detailContent");

    detail.innerHTML = `
      <div class="detail-hero">

        <div class="detail-badges">
          <span class="category-pill">
            ${escapeHTML(task.category)}
          </span>

          <span class="priority ${escapeHTML(task.priority)}">
            <i></i>
            ${escapeHTML(task.priority.toUpperCase())} PRIORITY
          </span>

          ${
            isCompleted(task)
              ? '<span class="category-pill" style="color:var(--green)">✓ COMPLETED</span>'
              : ""
          }
        </div>

        <h1>${escapeHTML(task.title)}</h1>

        <p class="detail-description">
          ${
            escapeHTML(task.description) ||
            "No description has been added yet."
          }
        </p>

        <div class="detail-meta-grid">

          <div class="detail-meta-item">
            <span>Due date</span>
            <strong>${escapeHTML(formatDate(task.due))}</strong>
          </div>

          <div class="detail-meta-item">
            <span>Created</span>
            <strong>${escapeHTML(formatDate(
              new Date(task.createdAt).toISOString().slice(0,10)
            ))}</strong>
          </div>

          <div class="detail-meta-item">
            <span>Checklist</span>
            <strong>${total} items</strong>
          </div>

          <div class="detail-meta-item">
            <span>Status</span>
            <strong>${
              isCompleted(task)
                ? "Completed"
                : isOverdue(task)
                  ? "Overdue"
                  : "In progress"
            }</strong>
          </div>

        </div>
      </div>

      <div class="detail-progress-panel">

        <div class="detail-progress-heading">
          <h2>Task progress</h2>
          <strong>${percentage}%</strong>
        </div>

        <div class="progress-track">
          <div class="progress-fill"
            style="width:${percentage}%">
          </div>
        </div>

        <div class="progress-footer">
          <span>${done} of ${total} checklist items completed</span>
          <span>${isCompleted(task) ? "All done!" : "Keep going"}</span>
        </div>

      </div>

      <section class="subtasks-panel">

        <div class="subtasks-heading">
          <div>
            <h2>Step-by-step checklist</h2>
            <p>Break this task into smaller, actionable steps.</p>
          </div>

          <span class="category-pill">
            ${done}/${total} DONE
          </span>
        </div>

        <div class="subtask-list" id="subtaskList"></div>

        <form class="add-subtask-form" id="addSubtaskForm">
          <input
            class="form-control"
            id="subtaskInput"
            maxlength="140"
            placeholder="Add the next step..."
            required
          >

          <button class="primary-button" type="submit">
            ＋ Add item
          </button>
        </form>

      </section>
    `;

    renderSubtasks(task);

    $("#addSubtaskForm").addEventListener(
      "submit",
      addSubtask
    );

    $("#editTaskButton").onclick = () =>
      openTaskModal(task.id);

    $("#deleteTaskButton").onclick = () =>
      askDeleteTask(task.id);
  }

  /* =======================================
     CHECKLIST MANAGEMENT
  ======================================= */

  function renderSubtasks(task) {
    const list = $("#subtaskList");

    list.innerHTML = "";

    if (!task.items.length) {
      list.innerHTML = `
        <div class="subtask-empty">
          No checklist items yet. Add your first step above
          to start tracking progress.
        </div>
      `;
      return;
    }

    task.items.forEach(item => {
      const row = document.createElement("div");

      row.className =
        `subtask-row${item.done ? " done" : ""}`;

      const toggle = document.createElement("button");
      toggle.className = "subtask-toggle";
      toggle.textContent = item.done ? "✓" : "";

      toggle.setAttribute(
        "aria-label",
        item.done ? "Mark incomplete" : "Mark complete"
      );

      const title = document.createElement("span");
      title.className = "subtask-title";
      title.textContent = item.title;

      const actions = document.createElement("div");
      actions.className = "subtask-actions";

      const edit = document.createElement("button");
      edit.textContent = "✎";
      edit.title = "Edit item";

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.title = "Delete item";

      toggle.addEventListener("click", () => {
        item.done = !item.done;

        // Recalculate task completion.
        task.completed =
          task.items.length > 0 &&
          task.items.every(i => i.done);

        saveTasks();
        renderTaskDetails();
        renderTasks();
      });

      edit.addEventListener("click", () => {
        editSubtask(item.id);
      });

      remove.addEventListener("click", () => {
        deleteSubtask(item.id);
      });

      actions.append(edit, remove);
      row.append(toggle, title, actions);

      list.appendChild(row);
    });
  }

  function addSubtask(event) {
    event.preventDefault();

    const task = getTask(currentTaskId);
    const input = $("#subtaskInput");

    if (!task) return;

    const title = input.value.trim();

    if (!title) return;

    task.items.push({
      id: uid(),
      title,
      done: false
    });

    task.completed = false;

    saveTasks();
    renderTaskDetails();
    renderTasks();

    notify("New checklist item added!");
  }

  function editSubtask(id) {
    const task = getTask(currentTaskId);

    if (!task) return;

    const item = task.items.find(
      item => item.id === id
    );

    if (!item) return;

    const updated = prompt(
      "Edit checklist item:",
      item.title
    );

    if (updated === null) return;

    if (!updated.trim()) {
      notify("Item title cannot be empty.", "error");
      return;
    }

    item.title = updated.trim();

    saveTasks();
    renderTaskDetails();
    renderTasks();

    notify("Checklist item updated!");
  }

  function deleteSubtask(id) {
    const task = getTask(currentTaskId);

    if (!task) return;

    if (!confirm("Delete this checklist item?")) {
      return;
    }

    task.items = task.items.filter(
      item => item.id !== id
    );

    // A task with a changed checklist needs
    // to be marked active again.
    task.completed = false;

    saveTasks();
    renderTaskDetails();
    renderTasks();

    notify("Checklist item deleted.");
  }

  /* =======================================
     DELETE TASK
  ======================================= */

  function askDeleteTask(id) {
    const task = getTask(id);

    if (!task) return;

    deleteTargetId = id;

    $("#confirmMessage").textContent =
      `"${task.title}" and its checklist items will be permanently removed from this device.`;

    openModal("confirmModal");
  }

  function confirmDeleteTask() {
    if (!deleteTargetId) return;

    const deletingCurrent =
      currentTaskId === deleteTargetId;

    tasks = tasks.filter(
      task => task.id !== deleteTargetId
    );

    if (!saveTasks()) return;

    closeModal("confirmModal");

    deleteTargetId = null;

    if (deletingCurrent) {
      showDashboard();
    } else {
      renderTasks();
    }

    notify("Task deleted successfully.");
  }

  /* =======================================
     FILTERS
  ======================================= */

  function setFilter(filter) {
    currentFilter = filter;

    $$(".filter-chip").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.filter === filter
      );
    });

    $$(".nav-item[data-filter]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter === filter
      );
    });

    const headings = {
      all: "Your tasks",
      active: "Tasks in progress",
      completed: "Completed tasks",
      overdue: "Overdue tasks"
    };

    $("#listTitle").textContent =
      headings[filter] || "Your tasks";

    renderTasks();
  }

  /* =======================================
     EXPORT DATA
  ======================================= */

  function exportData() {
    const backup = {
      app: "TaskFlow",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      tasks,
      settings
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `taskflow-backup-${today()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    notify("Your task backup has been exported!");
  }

  /* =======================================
     IMPORT DATA
  ======================================= */

  async function importData(file) {
    if (!file) return;

    try {
      const parsed = JSON.parse(
        await file.text()
      );

      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed.tasks;

      if (!Array.isArray(incoming)) {
        throw new Error(
          "This file does not contain a task list."
        );
      }

      const validTasks = incoming
        .filter(task =>
          task &&
          typeof task.title === "string" &&
          task.title.trim()
        )
        .map(task => ({
          id: task.id || uid(),
          title: task.title.trim(),
          description: String(task.description || ""),
          category: String(task.category || "Personal"),
          priority: ["low","medium","high"].includes(task.priority)
            ? task.priority : "medium",
          due: typeof task.due === "string" ? task.due : "",
          color: allowedAccents.includes(task.color)
            ? task.color : "violet",
          completed: Boolean(task.completed),
          createdAt: Number(task.createdAt) || Date.now(),
          items: Array.isArray(task.items)
            ? task.items
                .filter(item => item && typeof item.title === "string")
                .map(item => ({
                  id: item.id || uid(),
                  title: item.title,
                  done: Boolean(item.done)
                }))
            : []
        }));

      if (
        validTasks.length === 0 &&
        incoming.length > 0
      ) {
        throw new Error("No valid tasks were found.");
      }

      if (!confirm(
        `Import ${validTasks.length} task(s)? This will replace your current task list.`
      )) {
        return;
      }

      tasks = validTasks;

      if (parsed.settings && typeof parsed.settings === "object") {
        settings = {
          ...settings,
          mode: allowedModes.includes(parsed.settings.mode)
            ? parsed.settings.mode : settings.mode,
          accent: allowedAccents.includes(parsed.settings.accent)
            ? parsed.settings.accent : settings.accent
        };

        saveSettings();
        applyAppearance();
      }

      if (!saveTasks()) return;

      showDashboard();

      notify(
        `${validTasks.length} task(s) imported successfully!`
      );

    } catch (error) {
      notify(
        error.message || "Unable to import this file.",
        "error"
      );
    } finally {
      $("#importFile").value = "";
    }
  }

  /* =======================================
     NAVIGATION
  ======================================= */

  function navigateToFilter(filter) {
    $("#dashboardView").hidden = false;
    $("#detailView").hidden = true;

    currentTaskId = null;

    $("#breadcrumbTitle").textContent = "Overview";

    setFilter(filter);

    $("#sidebar").classList.remove("open");
  }

  /* =======================================
     EVENT LISTENERS
  ======================================= */

  $("#addTaskButton").addEventListener(
    "click",
    () => openTaskModal()
  );

  $("#emptyAddButton").addEventListener(
    "click",
    () => openTaskModal()
  );

  $("#taskForm").addEventListener(
    "submit",
    saveTask
  );

  $("#backButton").addEventListener(
    "click",
    showDashboard
  );

  $("#confirmDeleteButton").addEventListener(
    "click",
    confirmDeleteTask
  );

  $("#searchInput").addEventListener(
    "input",
    renderTasks
  );

  $("#sortSelect").addEventListener(
    "change",
    renderTasks
  );

  $$(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      navigateToFilter(button.dataset.filter);
    });
  });

  $$(".nav-item[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      navigateToFilter(button.dataset.filter);
    });
  });

  $("#appearanceBtn").addEventListener(
    "click",
    () => openModal("appearanceModal")
  );

  $("#themeButton").addEventListener(
    "click",
    toggleTheme
  );

  $("#quickTheme").addEventListener(
    "click",
    toggleTheme
  );

  $("#exportBtn").addEventListener(
    "click",
    exportData
  );

  $("#importBtn").addEventListener(
    "click",
    () => $("#importFile").click()
  );

  $("#importFile").addEventListener(
    "change",
    event => importData(event.target.files[0])
  );

  $("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  // Appearance options.
  $$(".mode-option").forEach(button => {
    button.addEventListener("click", () => {
      settings.mode = button.dataset.mode;

      saveSettings();
      applyAppearance();
    });
  });

  $$(".swatch").forEach(button => {
    button.addEventListener("click", () => {
      settings.accent = button.dataset.accent;

      saveSettings();
      applyAppearance();
    });
  });

  // Close buttons.
  $$("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  // Close dialog when backdrop is clicked.
  $$(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // Keyboard shortcuts.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && activeModal) {
      closeModal(activeModal);
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "n"
    ) {
      event.preventDefault();
      openTaskModal();
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      $("#searchInput").focus();
    }
  });

  // Follow system appearance changes.
  const colorScheme = window.matchMedia(
    "(prefers-color-scheme: light)"
  );

  colorScheme.addEventListener?.("change", () => {
    if (settings.mode === "system") {
      applyAppearance();
    }
  });

  /* =======================================
     INITIALIZATION
  ======================================= */

  function initializeApp() {
    applyAppearance();

    $("#todayLabel").textContent =
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });

    const hour = new Date().getHours();

    $("#welcomeTitle").innerHTML =
      hour < 12
        ? 'Good morning, <span>let’s focus.</span>'
        : hour < 17
          ? 'Make this afternoon <span>count.</span>'
          : 'Good evening, <span>you’ve got this.</span>';

    renderTasks();
  }

  initializeApp();

})();
