(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       1. PWA MANIFEST & ICON BOOTSTRAP (Works across Android, iOS, Desktop)
       ---------------------------------------------------------------------- */
    function setupPWAManifest() {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="112" fill="#120e1c"/>
          <rect x="44" y="44" width="424" height="424" rx="88" fill="none" stroke="#facc15" stroke-width="18"/>
          <path d="M164 264l64 64 128-144" fill="none" stroke="#facc15" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        const iconDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg);

        const appleTouchEl = document.getElementById('appleTouchIcon');
        if (appleTouchEl) appleTouchEl.href = iconDataUri;

        const manifestObj = {
            name: 'Tasks List — Task & Checklist Manager',
            short_name: 'Tasks List',
            description: 'Cross-device multi-theme To-Do & Task Card Manager by Ajay-Dhangar',
            start_url: location.href,
            display: 'standalone',
            orientation: 'any',
            background_color: '#120e1c',
            theme_color: '#120e1c',
            icons: [
                { src: iconDataUri, sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
                { src: iconDataUri, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
            ]
        };

        try {
            const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
            const manifestUrl = URL.createObjectURL(blob);
            const manifestLink = document.getElementById('pwaManifestLink');
            if (manifestLink) manifestLink.href = manifestUrl;
        } catch (err) {
            console.warn('Manifest blob setup skipped:', err);
        }

        // Detect if running in Standalone PWA mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const badge = document.getElementById('appModeBadge');
        if (isStandalone && badge) {
            badge.textContent = 'Installed PWA';
            document.getElementById('installAppBtn').classList.add('installed');
        }
    }

    /* ----------------------------------------------------------------------
       2. STATE & STORAGE KEYS
       ---------------------------------------------------------------------- */
    const STORAGE_KEYS = {
        TASKS: 'ajay_tasks_list_v2',
        THEME: 'ajay_tasks_theme_v2',
        MODE: 'ajay_tasks_mode_v2'
    };

    let state = {
        tasks: [],
        focusedTaskId: null,
        detailItemFilter: 'all', // 'all' | 'pending' | 'completed' inside Focused Detail View
        filter: 'all',           // 'all' | 'active' | 'completed' | 'high'
        search: '',
        sort: 'newest',
        theme: 'midnight',
        mode: 'dark',
        draftSteps: [],
        pendingDeleteAction: null,
        deferredInstallPrompt: null
    };

    /* ----------------------------------------------------------------------
       3. DOM REFERENCES
       ---------------------------------------------------------------------- */
    const htmlEl = document.documentElement;
    const cardsGrid = document.getElementById('cardsGrid');
    const emptyState = document.getElementById('emptyState');
    const dashboardControls = document.getElementById('dashboardControls');
    const focusHeaderBar = document.getElementById('focusHeaderBar');
    const focusTaskBreadcrumbTitle = document.getElementById('focusTaskBreadcrumbTitle');

    const taskDialog = document.getElementById('taskDialog');
    const taskForm = document.getElementById('taskForm');
    const itemDialog = document.getElementById('itemDialog');
    const itemForm = document.getElementById('itemForm');
    const confirmDialog = document.getElementById('confirmDialog');
    const installDialog = document.getElementById('installDialog');

    /* ----------------------------------------------------------------------
       4. INITIALIZATION & STORAGE
       ---------------------------------------------------------------------- */
    function init() {
        setupPWAManifest();
        loadPreferences();
        loadTasks();
        bindEvents();
        render();
    }

    function loadPreferences() {
        try {
            const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'midnight';
            const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) || 'dark';
            applyTheme(savedTheme, false);
            applyMode(savedMode, false);
        } catch (err) {
            console.warn('Preferences fallback:', err);
        }
    }

    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
            state.tasks = raw ? JSON.parse(raw) : [];
        } catch (err) {
            state.tasks = [];
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
        } catch (err) {
            showToast('Storage warning: unable to persist data.');
        }
    }

    function generateId() {
        return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    }

    /* ----------------------------------------------------------------------
       5. THEME & DARK/LIGHT MODE
       ---------------------------------------------------------------------- */
    function applyTheme(themeName, persist = true) {
        state.theme = themeName;
        htmlEl.setAttribute('data-theme', themeName);
        document.querySelectorAll('.theme-swatch').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeChoice === themeName);
        });
        if (persist) localStorage.setItem(STORAGE_KEYS.THEME, themeName);
    }

    function applyMode(modeName, persist = true) {
        state.mode = modeName;
        htmlEl.setAttribute('data-mode', modeName);
        const sunIcon = document.getElementById('modeIconSun');
        const moonIcon = document.getElementById('modeIconMoon');
        const metaTheme = document.getElementById('metaThemeColor');

        if (modeName === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            if (metaTheme) metaTheme.setAttribute('content', '#120e1c');
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            if (metaTheme) metaTheme.setAttribute('content', '#f4f6fb');
        }
        if (persist) localStorage.setItem(STORAGE_KEYS.MODE, modeName);
    }

    /* ----------------------------------------------------------------------
       6. PROGRESS & KPI CALCULATIONS
       ---------------------------------------------------------------------- */
    function getTaskProgress(task) {
        const total = task.items.length;
        if (total === 0) {
            return {
                completedCount: 0,
                totalCount: 0,
                percent: task.completed ? 100 : 0,
                isDone: Boolean(task.completed)
            };
        }
        const completedCount = task.items.filter(item => item.completed).length;
        const percent = Math.round((completedCount / total) * 100);
        return {
            completedCount,
            totalCount: total,
            percent,
            isDone: completedCount === total
        };
    }

    function updateDashboardStats() {
        const totalLists = state.tasks.length;
        let totalItems = 0;
        let completedItems = 0;
        let completedLists = 0;

        state.tasks.forEach(task => {
            const prog = getTaskProgress(task);
            totalItems += prog.totalCount;
            completedItems += prog.completedCount;
            if (prog.isDone) completedLists++;
        });

        const overallPct = totalItems > 0
            ? Math.round((completedItems / totalItems) * 100)
            : (totalLists > 0 ? Math.round((completedLists / totalLists) * 100) : 0);

        document.getElementById('statTotalLists').textContent = totalLists;
        document.getElementById('statTotalItems').textContent = totalItems;
        document.getElementById('statCompletedSteps').textContent = completedItems;
        document.getElementById('statOverallProgress').textContent = overallPct + '%';
    }

    /* ----------------------------------------------------------------------
       7. FILTER & SORT PIPELINE
       ---------------------------------------------------------------------- */
    function getVisibleTasks() {
        if (state.focusedTaskId) {
            const found = state.tasks.find(t => t.id === state.focusedTaskId);
            if (found) return [found];
            state.focusedTaskId = null;
        }

        let list = [...state.tasks];

        if (state.search.trim() !== '') {
            const q = state.search.trim().toLowerCase();
            list = list.filter(task => {
                const titleMatch = task.title.toLowerCase().includes(q);
                const catMatch = (task.category || '').toLowerCase().includes(q);
                const descMatch = (task.description || '').toLowerCase().includes(q);
                const itemMatch = task.items.some(it => it.text.toLowerCase().includes(q));
                return titleMatch || catMatch || descMatch || itemMatch;
            });
        }

        if (state.filter === 'active') {
            list = list.filter(t => !getTaskProgress(t).isDone);
        } else if (state.filter === 'completed') {
            list = list.filter(t => getTaskProgress(t).isDone);
        } else if (state.filter === 'high') {
            list = list.filter(t => t.priority === 'high');
        }

        const priorityWeight = { high: 3, medium: 2, low: 1 };

        list.sort((a, b) => {
            if (state.sort === 'progress-desc') {
                return getTaskProgress(b).percent - getTaskProgress(a).percent;
            }
            if (state.sort === 'priority') {
                return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
            }
            if (state.sort === 'alpha') {
                return a.title.localeCompare(b.title);
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        return list;
    }

    /* ----------------------------------------------------------------------
       8. MAIN RENDER ENGINE
       ---------------------------------------------------------------------- */
    function render() {
        const hasAnyTasks = state.tasks.length > 0;

        if (!hasAnyTasks) {
            emptyState.style.display = 'flex';
            dashboardControls.style.display = 'none';
            focusHeaderBar.style.display = 'none';
            cardsGrid.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        updateDashboardStats();

        if (state.focusedTaskId) {
            const focusedTask = state.tasks.find(t => t.id === state.focusedTaskId);
            if (focusedTask) {
                dashboardControls.style.display = 'none';
                focusHeaderBar.style.display = 'flex';
                focusTaskBreadcrumbTitle.textContent = focusedTask.title;
                cardsGrid.classList.add('focused-mode');
            } else {
                state.focusedTaskId = null;
            }
        }

        if (!state.focusedTaskId) {
            dashboardControls.style.display = 'flex';
            focusHeaderBar.style.display = 'none';
            cardsGrid.classList.remove('focused-mode');
        }

        const visibleTasks = getVisibleTasks();
        cardsGrid.innerHTML = '';

        if (visibleTasks.length === 0) {
            cardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
              <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem;">No matching tasks found</p>
              <p style="font-size: 0.9rem;">Try clearing your search input or changing filter tabs.</p>
            </div>
          `;
            return;
        }

        visibleTasks.forEach(task => {
            cardsGrid.appendChild(createTaskCardElement(task, Boolean(state.focusedTaskId)));
        });
    }

    function createTaskCardElement(task, isFocused) {
        const prog = getTaskProgress(task);
        const card = document.createElement('article');
        card.className = `task-card ${prog.isDone ? 'is-completed' : ''}`;
        card.dataset.taskId = task.id;

        let dueHtml = '';
        if (task.dueDate) {
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = !prog.isDone && task.dueDate < todayStr;
            dueHtml = `
            <span class="due-tag ${isOverdue ? 'overdue' : ''}" title="Target Due Date">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              ${escapeHtml(task.dueDate)}
            </span>
          `;
        }

        const priorityClass = `badge-${task.priority || 'medium'}`;
        const priorityLabel = prog.isDone ? 'Completed' : `${task.priority || 'medium'}`;
        const badgeToUse = prog.isDone ? 'badge-done' : priorityClass;
        const categoryHtml = task.category ? `<span class="badge badge-tag">${escapeHtml(task.category)}</span>` : '';

        // Filter steps inside Focused Detail View if active
        let itemsToRender = task.items;
        if (isFocused) {
            if (state.detailItemFilter === 'pending') {
                itemsToRender = task.items.filter(i => !i.completed);
            } else if (state.detailItemFilter === 'completed') {
                itemsToRender = task.items.filter(i => i.completed);
            }
        }

        const detailTabsHtml = isFocused ? `
          <div class="detail-step-filters">
            <div class="detail-tabs">
              <button type="button" class="detail-tab-btn ${state.detailItemFilter === 'all' ? 'active' : ''}" data-action="detail-filter" data-detail-filter="all">All Steps (${task.items.length})</button>
              <button type="button" class="detail-tab-btn ${state.detailItemFilter === 'pending' ? 'active' : ''}" data-action="detail-filter" data-detail-filter="pending">Pending</button>
              <button type="button" class="detail-tab-btn ${state.detailItemFilter === 'completed' ? 'active' : ''}" data-action="detail-filter" data-detail-filter="completed">Completed</button>
            </div>
          </div>
        ` : '';

        let itemsHtml = '';
        if (itemsToRender.length === 0) {
            itemsHtml = `
            <li class="empty-items-hint" data-action="open-add-item" data-task-id="${task.id}">
              ${task.items.length === 0 ? 'No steps yet — tap <strong>+</strong> below to add items!' : 'No steps in this filter.'}
            </li>
          `;
        } else {
            itemsHtml = itemsToRender.map((item, idx) => {
                const realIndex = task.items.findIndex(x => x.id === item.id);
                const reorderControls = isFocused ? `
              <button class="mini-icon-btn mini-reorder" data-action="move-item-up" data-task-id="${task.id}" data-item-id="${item.id}" title="Move Up" ${realIndex === 0 ? 'disabled style="opacity:0.35"' : ''}>↑</button>
              <button class="mini-icon-btn mini-reorder" data-action="move-item-down" data-task-id="${task.id}" data-item-id="${item.id}" title="Move Down" ${realIndex === task.items.length - 1 ? 'disabled style="opacity:0.35"' : ''}>↓</button>
            ` : '';

                return `
              <li class="sub-item ${item.completed ? 'done' : ''}" data-item-id="${item.id}">
                <div class="sub-item-left" data-action="toggle-item" data-task-id="${task.id}" data-item-id="${item.id}">
                  <span class="sub-item-text">${escapeHtml(item.text)}</span>
                </div>
                <div class="sub-item-actions">
                  ${reorderControls}
                  <button class="mini-icon-btn mini-edit" data-action="edit-item" data-task-id="${task.id}" data-item-id="${item.id}" title="Edit Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="mini-icon-btn mini-delete" data-action="delete-item" data-task-id="${task.id}" data-item-id="${item.id}" title="Delete Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                  <button class="mini-icon-btn mini-check" data-action="toggle-item" data-task-id="${task.id}" data-item-id="${item.id}" title="Toggle Complete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                </div>
              </li>
            `;
            }).join('');
        }

        card.innerHTML = `
          <div class="card-meta-top">
            <div class="meta-badges-left">
              <span class="badge ${badgeToUse}">${priorityLabel}</span>
              ${categoryHtml}
            </div>
            ${dueHtml}
          </div>

          <div class="card-title-row">
            <h3 class="card-title" data-action="focus-task" data-task-id="${task.id}" title="Click to open card details">
              ${escapeHtml(task.title)}
            </h3>
            ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ''}
          </div>

          <div class="progress-wrapper">
            <div class="progress-header">
              <span>${prog.completedCount} of ${prog.totalCount} done</span>
              <span>${prog.percent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${prog.isDone ? 'complete' : ''}" style="width: ${prog.percent}%"></div>
            </div>
          </div>

          ${detailTabsHtml}

          <ul class="items-list">
            ${itemsHtml}
          </ul>

          <div class="card-footer-actions">
            <button class="card-action-btn edit-card-btn" data-action="edit-task" data-task-id="${task.id}" title="Edit Task Card">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <button class="card-action-btn complete-card-btn ${prog.isDone ? 'active' : ''}" data-action="complete-task" data-task-id="${task.id}" title="Mark Entire Card Complete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>

            <button class="card-action-btn delete-card-btn" data-action="delete-task" data-task-id="${task.id}" title="Delete Task Card">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>

            <button class="card-action-btn add-item-circle" data-action="open-add-item" data-task-id="${task.id}" title="Add New Item">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        `;

        return card;
    }

    /* ----------------------------------------------------------------------
       9. DIALOG HELPERS
       ---------------------------------------------------------------------- */
    function openAddTaskModal() {
        document.getElementById('taskDialogHeading').textContent = 'Add New Task';
        document.getElementById('saveTaskSubmitBtn').textContent = 'Add';
        document.getElementById('editTaskId').value = '';
        document.getElementById('taskTitleInput').value = '';
        document.getElementById('taskCategoryInput').value = '';
        document.getElementById('taskDescInput').value = '';
        document.getElementById('taskPriorityInput').value = 'medium';
        document.getElementById('taskDueInput').value = '';
        document.getElementById('stepBuilderWrapper').style.display = 'flex';
        state.draftSteps = [];
        renderDraftSteps();
        taskDialog.showModal();
        document.getElementById('taskTitleInput').focus();
    }

    function openEditTaskModal(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('taskDialogHeading').textContent = 'Edit Task';
        document.getElementById('saveTaskSubmitBtn').textContent = 'Update';
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('taskTitleInput').value = task.title;
        document.getElementById('taskCategoryInput').value = task.category || '';
        document.getElementById('taskDescInput').value = task.description || '';
        document.getElementById('taskPriorityInput').value = task.priority || 'medium';
        document.getElementById('taskDueInput').value = task.dueDate || '';
        document.getElementById('stepBuilderWrapper').style.display = 'none';
        taskDialog.showModal();
        document.getElementById('taskTitleInput').focus();
    }

    function renderDraftSteps() {
        const container = document.getElementById('draftStepsContainer');
        container.innerHTML = state.draftSteps.map((step, idx) => `
          <div class="step-pill">
            <span>${idx + 1}. ${escapeHtml(step)}</span>
            <div class="step-pill-actions">
              <button type="button" data-move-draft-up="${idx}" title="Move Up" ${idx === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" data-move-draft-down="${idx}" title="Move Down" ${idx === state.draftSteps.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" data-remove-draft="${idx}" style="color:#f87171;" title="Remove">×</button>
            </div>
          </div>
        `).join('');
    }

    function openAddItemModal(taskId) {
        document.getElementById('itemDialogHeading').textContent = 'Add New Item';
        document.getElementById('saveItemSubmitBtn').textContent = 'Add';
        document.getElementById('itemParentTaskId').value = taskId;
        document.getElementById('editItemId').value = '';
        document.getElementById('itemTextInput').value = '';
        itemDialog.showModal();
        document.getElementById('itemTextInput').focus();
    }

    function openEditItemModal(taskId, itemId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const item = task.items.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('itemDialogHeading').textContent = 'Edit Item';
        document.getElementById('saveItemSubmitBtn').textContent = 'Save';
        document.getElementById('itemParentTaskId').value = taskId;
        document.getElementById('editItemId').value = itemId;
        document.getElementById('itemTextInput').value = item.text;
        itemDialog.showModal();
        document.getElementById('itemTextInput').focus();
    }

    function requestConfirmDelete(message, onConfirmCallback) {
        document.getElementById('confirmMessage').textContent = message;
        state.pendingDeleteAction = onConfirmCallback;
        confirmDialog.showModal();
    }

    function triggerPWAInstall() {
        if (state.deferredInstallPrompt) {
            state.deferredInstallPrompt.prompt();
            state.deferredInstallPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    showToast('Tasks List installed successfully!');
                    document.getElementById('installAppBtn').classList.add('installed');
                }
                state.deferredInstallPrompt = null;
            });
        } else {
            installDialog.showModal();
        }
    }

    /* ----------------------------------------------------------------------
       10. EVENT LISTENERS & KEYBOARD SHORTCUTS
       ---------------------------------------------------------------------- */
    function bindEvents() {
        // Capture native browser install prompt (Android / Desktop Chrome / Edge)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            state.deferredInstallPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            document.getElementById('installAppBtn').classList.add('installed');
            document.getElementById('appModeBadge').textContent = 'Installed PWA';
            showToast('App installed on your device!');
        });

        // Install Buttons (Header & Mobile Nav)
        document.getElementById('installAppBtn').addEventListener('click', triggerPWAInstall);
        document.getElementById('mobInstallBtn').addEventListener('click', triggerPWAInstall);
        document.getElementById('closeInstallDialogX').addEventListener('click', () => installDialog.close());
        document.getElementById('closeInstallDialogBtn').addEventListener('click', () => installDialog.close());

        // Theme Swatches
        document.querySelectorAll('.theme-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                applyTheme(btn.dataset.themeChoice);
                showToast(`Theme: ${btn.dataset.themeChoice.toUpperCase()}`);
            });
        });

        // Dark / Light Mode Toggle
        document.getElementById('modeToggleBtn').addEventListener('click', () => {
            const nextMode = state.mode === 'dark' ? 'light' : 'dark';
            applyMode(nextMode);
            showToast(`${nextMode === 'dark' ? 'Dark' : 'Light'} mode enabled`);
        });

        // Brand Logo & Mobile All Cards Button -> Return to Grid Overview
        const goHomeOverview = () => {
            state.focusedTaskId = null;
            state.detailItemFilter = 'all';
            render();
        };
        document.getElementById('brandHomeBtn').addEventListener('click', goHomeOverview);
        document.getElementById('mobAllBtn').addEventListener('click', goHomeOverview);

        // Open Add Task Modal Buttons
        document.getElementById('openAddTaskBtn').addEventListener('click', openAddTaskModal);
        document.getElementById('emptyAddTaskBtn').addEventListener('click', openAddTaskModal);
        document.getElementById('mobAddBtn').addEventListener('click', openAddTaskModal);
        document.getElementById('focusNewTaskBtn').addEventListener('click', openAddTaskModal);

        // Focused Detail View Back & Add Item Buttons
        document.getElementById('backToAllBtn').addEventListener('click', goHomeOverview);
        document.getElementById('focusAddItemBtn').addEventListener('click', () => {
            if (state.focusedTaskId) openAddItemModal(state.focusedTaskId);
        });

        // Step-by-Step Draft Builder inside Add Task Modal
        const stepDraftInput = document.getElementById('stepItemDraftInput');
        document.getElementById('addDraftStepBtn').addEventListener('click', () => {
            const val = stepDraftInput.value.trim();
            if (!val) return;
            state.draftSteps.push(val);
            stepDraftInput.value = '';
            renderDraftSteps();
            stepDraftInput.focus();
        });

        stepDraftInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('addDraftStepBtn').click();
            }
        });

        document.getElementById('draftStepsContainer').addEventListener('click', (e) => {
            const removeIdx = e.target.dataset.removeDraft;
            const upIdx = e.target.dataset.moveDraftUp;
            const downIdx = e.target.dataset.moveDraftDown;

            if (removeIdx !== undefined) {
                state.draftSteps.splice(Number(removeIdx), 1);
                renderDraftSteps();
            } else if (upIdx !== undefined) {
                const i = Number(upIdx);
                if (i > 0) {
                    [state.draftSteps[i - 1], state.draftSteps[i]] = [state.draftSteps[i], state.draftSteps[i - 1]];
                    renderDraftSteps();
                }
            } else if (downIdx !== undefined) {
                const i = Number(downIdx);
                if (i < state.draftSteps.length - 1) {
                    [state.draftSteps[i + 1], state.draftSteps[i]] = [state.draftSteps[i], state.draftSteps[i + 1]];
                    renderDraftSteps();
                }
            }
        });

        // Submit Add/Edit Task Form
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitleInput').value.trim();
            if (!title) return;

            const category = document.getElementById('taskCategoryInput').value.trim();
            const description = document.getElementById('taskDescInput').value.trim();
            const priority = document.getElementById('taskPriorityInput').value;
            const dueDate = document.getElementById('taskDueInput').value;
            const editId = document.getElementById('editTaskId').value;

            if (editId) {
                const task = state.tasks.find(t => t.id === editId);
                if (task) {
                    task.title = title;
                    task.category = category;
                    task.description = description;
                    task.priority = priority;
                    task.dueDate = dueDate;
                    showToast('Task card updated');
                }
            } else {
                const leftoverDraft = stepDraftInput.value.trim();
                if (leftoverDraft) state.draftSteps.push(leftoverDraft);

                const newTask = {
                    id: generateId(),
                    title,
                    category,
                    description,
                    priority,
                    dueDate,
                    completed: false,
                    createdAt: Date.now(),
                    items: state.draftSteps.map(stepText => ({
                        id: generateId(),
                        text: stepText,
                        completed: false
                    }))
                };
                state.tasks.unshift(newTask);
                showToast(`Task "${title}" added!`);
            }

            saveTasks();
            taskDialog.close();
            render();
        });

        // Submit Add/Edit Single Item Form
        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('itemTextInput').value.trim();
            const taskId = document.getElementById('itemParentTaskId').value;
            const editItemId = document.getElementById('editItemId').value;
            if (!text || !taskId) return;

            const task = state.tasks.find(t => t.id === taskId);
            if (!task) return;

            if (editItemId) {
                const item = task.items.find(i => i.id === editItemId);
                if (item) {
                    item.text = text;
                    showToast('Item updated');
                }
            } else {
                task.items.push({
                    id: generateId(),
                    text,
                    completed: false
                });
                task.completed = false;
                showToast('Step added');
            }

            saveTasks();
            itemDialog.close();
            render();
        });

        // Close Dialog Buttons
        document.getElementById('cancelTaskDialogBtn').addEventListener('click', () => taskDialog.close());
        document.getElementById('closeTaskDialogX').addEventListener('click', () => taskDialog.close());
        document.getElementById('cancelItemDialogBtn').addEventListener('click', () => itemDialog.close());
        document.getElementById('closeItemDialogX').addEventListener('click', () => itemDialog.close());

        document.getElementById('confirmDeleteNoBtn').addEventListener('click', () => {
            state.pendingDeleteAction = null;
            confirmDialog.close();
        });
        document.getElementById('confirmDeleteYesBtn').addEventListener('click', () => {
            if (typeof state.pendingDeleteAction === 'function') state.pendingDeleteAction();
            state.pendingDeleteAction = null;
            confirmDialog.close();
        });

        // Delegated Click Events inside Cards Grid
        cardsGrid.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;
            const taskId = actionEl.dataset.taskId;
            const itemId = actionEl.dataset.itemId;

            if (action === 'focus-task') {
                state.focusedTaskId = taskId;
                state.detailItemFilter = 'all';
                render();
            } else if (action === 'detail-filter') {
                state.detailItemFilter = actionEl.dataset.detailFilter;
                render();
            } else if (action === 'open-add-item') {
                openAddItemModal(taskId);
            } else if (action === 'edit-task') {
                openEditTaskModal(taskId);
            } else if (action === 'delete-task') {
                const task = state.tasks.find(t => t.id === taskId);
                requestConfirmDelete(`Delete "${task ? task.title : 'this task'}" and all its steps?`, () => {
                    state.tasks = state.tasks.filter(t => t.id !== taskId);
                    if (state.focusedTaskId === taskId) state.focusedTaskId = null;
                    saveTasks();
                    render();
                    showToast('Task card deleted');
                });
            } else if (action === 'complete-task') {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;
                const prog = getTaskProgress(task);
                const targetDone = !prog.isDone;
                task.completed = targetDone;
                task.items.forEach(it => { it.completed = targetDone; });
                saveTasks();
                render();
                showToast(targetDone ? 'Task card completed!' : 'Task card reopened');
            } else if (action === 'toggle-item') {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;
                const item = task.items.find(i => i.id === itemId);
                if (!item) return;
                item.completed = !item.completed;
                task.completed = task.items.length > 0 && task.items.every(i => i.completed);
                saveTasks();
                render();
            } else if (action === 'edit-item') {
                openEditItemModal(taskId, itemId);
            } else if (action === 'delete-item') {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;
                task.items = task.items.filter(i => i.id !== itemId);
                saveTasks();
                render();
                showToast('Step removed');
            } else if (action === 'move-item-up' || action === 'move-item-down') {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;
                const idx = task.items.findIndex(i => i.id === itemId);
                if (idx === -1) return;
                const targetIdx = action === 'move-item-up' ? idx - 1 : idx + 1;
                if (targetIdx >= 0 && targetIdx < task.items.length) {
                    [task.items[idx], task.items[targetIdx]] = [task.items[targetIdx], task.items[idx]];
                    saveTasks();
                    render();
                }
            }
        });

        // Search, Filter Pills & Sort Controls
        document.getElementById('searchInput').addEventListener('input', (e) => {
            state.search = e.target.value;
            render();
        });

        document.getElementById('filterPillsGroup').addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.filter = pill.dataset.filter;
            render();
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            state.sort = e.target.value;
            render();
        });

        // Export JSON Backup
        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            if (state.tasks.length === 0) {
                showToast('No tasks to export yet.');
                return;
            }
            const blob = new Blob([JSON.stringify(state.tasks, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tasks-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Backup exported as JSON!');
        });

        // Import JSON Backup
        const importInput = document.getElementById('importFileInput');
        document.getElementById('importJsonBtn').addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (Array.isArray(imported)) {
                        state.tasks = imported;
                        state.focusedTaskId = null;
                        saveTasks();
                        render();
                        showToast(`Imported ${imported.length} task cards!`);
                    } else {
                        showToast('Invalid JSON backup format.');
                    }
                } catch (err) {
                    showToast('Could not parse JSON file.');
                }
            };
            reader.readAsText(file);
            importInput.value = '';
        });

        // Load Sample Tasks ('Go To Mandsaur', 'Go To Indore', 'Go To Bhopal')
        document.getElementById('loadSampleBtn').addEventListener('click', () => {
            state.tasks = [
                {
                    id: generateId(),
                    title: 'Go To Mandsaur',
                    category: 'Travel',
                    description: 'Weekend trip & temple visit checklist',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                    completed: false,
                    createdAt: Date.now() - 3000,
                    items: [
                        { id: generateId(), text: 'Task-1: Book train tickets', completed: true },
                        { id: generateId(), text: 'Task-2: Pack travel essentials', completed: false },
                        { id: generateId(), text: 'Task-3: Confirm hotel reservation', completed: false },
                        { id: generateId(), text: 'Task-4: Visit Pashupatinath Temple', completed: false }
                    ]
                },
                {
                    id: generateId(),
                    title: 'Go To Indore',
                    category: 'Work',
                    description: 'Tech meetup & Sarafa food tour',
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
                    completed: false,
                    createdAt: Date.now() - 2000,
                    items: [
                        { id: generateId(), text: 'Task-1: Prepare demo presentation', completed: true },
                        { id: generateId(), text: 'Task-2: Meet design team', completed: false },
                        { id: generateId(), text: 'Task-3: Explore Sarafa Bazaar', completed: false }
                    ]
                },
                {
                    id: generateId(),
                    title: 'Go To Bhopal',
                    category: 'Personal',
                    description: 'Lake City weekend getaway',
                    priority: 'low',
                    dueDate: new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
                    completed: false,
                    createdAt: Date.now() - 1000,
                    items: [
                        { id: generateId(), text: 'Task-1: Visit Upper Lake & Van Vihar', completed: false },
                        { id: generateId(), text: 'Task-2: Book return cab', completed: false }
                    ]
                }
            ];
            saveTasks();
            render();
            showToast('Sample tasks loaded!');
        });

        // Global Keyboard Shortcuts (N = New Task, / = Search, Esc = Back to Overview)
        document.addEventListener('keydown', (e) => {
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
            const anyDialogOpen = document.querySelector('dialog[open]');

            if (anyDialogOpen || isInputFocused) return;

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                openAddTaskModal();
            } else if (e.key === '/') {
                const searchEl = document.getElementById('searchInput');
                if (searchEl && state.tasks.length > 0 && !state.focusedTaskId) {
                    e.preventDefault();
                    searchEl.focus();
                }
            } else if (e.key === 'Escape' && state.focusedTaskId) {
                goHomeOverview();
            }
        });
    }

    /* ----------------------------------------------------------------------
       11. UTILITIES
       ---------------------------------------------------------------------- */
    function showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 260);
        }, 2600);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    init();
})();