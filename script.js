// DOM Elements
const taskInput = document.getElementById('task-input');
const dateInput = document.getElementById('date-input');
const priorityInput = document.getElementById('priority-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const themeToggle = document.getElementById('theme-toggle');
const taskStats = document.getElementById('task-stats');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let searchQuery = '';
let editingTaskId = null;

// ====================
// Theme Management
// ====================
function initTheme() {
    const savedTheme = localStorage.getItem('taskmaster_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDark) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('title', 'Switch to light mode');
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('title', 'Switch to dark mode');
    }
}

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('taskmaster_theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    themeToggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
});

// ====================
// Utilities
// ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function isOverdue(dateStr, completed) {
    if (!dateStr || completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateStr.split('-');
    const taskDate = new Date(year, month - 1, day);
    return taskDate < today;
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ====================
// Task Operations
// ====================
function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.focus();
        return;
    }

    const newTask = {
        id: Date.now(),
        text: text,
        date: dateInput.value,
        priority: priorityInput.value || 'Medium',
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();

    taskInput.value = '';
    dateInput.value = '';
    priorityInput.value = 'Medium';
    taskInput.focus();

    renderTasks();
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    const taskElement = document.querySelector(`.task-item[data-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('deleting');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        }, 320);
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }
}

function startEditing(id) {
    editingTaskId = id;
    renderTasks();
}

function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (trimmed) {
        tasks = tasks.map(t => (t.id === id ? { ...t, text: trimmed } : t));
        saveTasks();
    }
    editingTaskId = null;
    renderTasks();
}

function cancelEdit() {
    editingTaskId = null;
    renderTasks();
}

function clearCompletedTasks() {
    const completedItems = document.querySelectorAll('.task-item.completed');
    if (completedItems.length > 0) {
        completedItems.forEach(item => item.classList.add('deleting'));
        setTimeout(() => {
            tasks = tasks.filter(t => !t.completed);
            saveTasks();
            renderTasks();
        }, 320);
    } else {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
    }
}

// ====================
// Rendering
// ====================
function updateStats(filteredCount) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    if (taskStats) {
        if (total === 0) {
            taskStats.textContent = '0 tasks';
        } else {
            taskStats.textContent = `${pending} pending · ${completed} completed`;
        }
    }

    if (clearCompletedBtn) {
        clearCompletedBtn.style.display = completed > 0 ? 'inline-block' : 'none';
    }
}

function renderTasks() {
    taskList.innerHTML = '';

    let filtered = tasks.filter(task => {
        if (currentFilter === 'completed') return task.completed;
        if (currentFilter === 'pending') return !task.completed;
        return true;
    });

    if (searchQuery) {
        filtered = filtered.filter(task =>
            task.text.toLowerCase().includes(searchQuery)
        );
    }

    updateStats(filtered.length);

    if (filtered.length === 0) {
        let emptyIcon = 'fa-clipboard-list';
        let emptyMsg = 'No tasks yet. Add one above!';

        if (searchQuery) {
            emptyIcon = 'fa-search';
            emptyMsg = `No tasks matching "${escapeHtml(searchQuery)}"`;
        } else if (currentFilter === 'completed') {
            emptyIcon = 'fa-circle-check';
            emptyMsg = 'No completed tasks yet';
        } else if (currentFilter === 'pending') {
            emptyIcon = 'fa-check-double';
            emptyMsg = 'All caught up! No pending tasks.';
        }

        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-state';
        emptyLi.innerHTML = `
            <i class="fas ${emptyIcon}"></i>
            <p>${emptyMsg}</p>
        `;
        taskList.appendChild(emptyLi);
        return;
    }

    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        const isEditing = editingTaskId === task.id;
        const overdue = isOverdue(task.date, task.completed);
        const overdueClass = overdue ? ' overdue' : '';

        const dateBadge = task.date
            ? `<span class="due-date${overdueClass}" title="${overdue ? 'Task is overdue!' : 'Due date'}">
                <i class="far fa-calendar-alt"></i> ${formatDate(task.date)}${overdue ? ' (Overdue)' : ''}
               </span>`
            : '';

        if (isEditing) {
            li.innerHTML = `
                <div class="inline-edit-box">
                    <input type="text" class="inline-edit-input" value="${escapeHtml(task.text)}" />
                    <button class="save-edit-btn" title="Save changes" aria-label="Save">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="cancel-edit-btn" title="Cancel edit" aria-label="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            const editInput = li.querySelector('.inline-edit-input');
            const saveBtn = li.querySelector('.save-edit-btn');
            const cancelBtn = li.querySelector('.cancel-edit-btn');

            setTimeout(() => {
                editInput.focus();
                editInput.select();
            }, 50);

            editInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveEdit(task.id, editInput.value);
                if (e.key === 'Escape') cancelEdit();
            });

            saveBtn.addEventListener('click', () => saveEdit(task.id, editInput.value));
            cancelBtn.addEventListener('click', cancelEdit);
        } else {
            li.innerHTML = `
                <i class="checkbox-custom ${task.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}" title="${task.completed ? 'Mark as pending' : 'Mark as completed'}"></i>
                <div class="task-content">
                    <span class="task-text" title="Click to toggle status">${escapeHtml(task.text)}</span>
                    <div class="task-meta">
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                        ${dateBadge}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="edit-btn" title="Edit task" aria-label="Edit task">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-btn" title="Delete task" aria-label="Delete task">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            const checkbox = li.querySelector('.checkbox-custom');
            const taskText = li.querySelector('.task-text');
            const editBtn = li.querySelector('.edit-btn');
            const deleteBtn = li.querySelector('.delete-btn');

            checkbox.addEventListener('click', () => toggleTask(task.id));
            taskText.addEventListener('click', () => toggleTask(task.id));
            editBtn.addEventListener('click', () => startEditing(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
        }

        taskList.appendChild(li);
    });
}

// ====================
// Event Listeners
// ====================
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTasks();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
}

// ====================
// Initialization
// ====================
initTheme();
renderTasks();