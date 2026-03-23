// 📋 EXAMPLE FILE — use this as a reference when writing frontend JavaScript.
// Shows how to make fetch calls to a REST API and render data to the DOM.

/**
 * main.js — Frontend logic for the Task Manager app.
 *
 * This file demonstrates how to:
 *  - Make async/await fetch calls to a REST API
 *  - Render data to the DOM
 *  - Handle form submissions
 *  - Use event delegation for dynamic button clicks
 */

// ---------------------------------------------------------------------------
// API base URL — all fetch calls use this as a prefix
// ---------------------------------------------------------------------------

const API_URL = '/api/tasks';

// ---------------------------------------------------------------------------
// DOM element references
// ---------------------------------------------------------------------------

const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskList = document.getElementById('task-list');

// ---------------------------------------------------------------------------
// API functions — each one talks to a different endpoint
// ---------------------------------------------------------------------------

/**
 * Fetch all tasks from the API.
 * @returns {Promise<Array>} Array of task objects.
 */
const fetchTasks = async () => {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  return response.json();
};

/**
 * Create a new task.
 * @param {string} title - The title for the new task.
 * @returns {Promise<Object>} The created task object.
 */
const createTask = async (title) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }

  return response.json();
};

/**
 * Toggle a task's completed status.
 * @param {number} id        - The task ID.
 * @param {boolean} completed - The new completed value.
 * @returns {Promise<Object>} The updated task object.
 */
const toggleTask = async (id, completed) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    throw new Error('Failed to update task');
  }

  return response.json();
};

/**
 * Delete a task by ID.
 * @param {number} id - The task ID to delete.
 */
const deleteTask = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
};

// ---------------------------------------------------------------------------
// Rendering — turn task data into HTML elements
// ---------------------------------------------------------------------------

/**
 * Render an array of tasks into the task list.
 * Clears the list first, then creates an <li> for each task.
 * @param {Array} tasks - Array of task objects from the API.
 */
const renderTasks = (tasks) => {
  // Clear the current list
  taskList.innerHTML = '';

  tasks.forEach((task) => {
    const li = document.createElement('li');

    // Add 'completed' class when the task is done
    if (task.completed) {
      li.classList.add('completed');
    }

    // Task title text
    const span = document.createElement('span');
    span.textContent = task.title;

    // Toggle complete / undo button
    const toggleBtn = document.createElement('button');
    toggleBtn.classList.add('toggle-btn');
    toggleBtn.textContent = task.completed ? 'Undo' : 'Done';
    toggleBtn.dataset.id = task.id;
    toggleBtn.dataset.completed = task.completed;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.id = task.id;

    li.appendChild(span);
    li.appendChild(toggleBtn);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
};

// ---------------------------------------------------------------------------
// Load tasks — fetch from API and render
// ---------------------------------------------------------------------------

/**
 * Load all tasks from the API and render them on the page.
 */
const loadTasks = async () => {
  try {
    const tasks = await fetchTasks();
    renderTasks(tasks);
  } catch (error) {
    showError(error.message);
  }
};

// ---------------------------------------------------------------------------
// Error display helper
// ---------------------------------------------------------------------------

/**
 * Show a simple error message to the user.
 * @param {string} message - The error message to display.
 */
const showError = (message) => {
  alert(message);
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

// Handle new task form submission
taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  if (!title) return;

  try {
    await createTask(title);
    taskTitleInput.value = '';
    await loadTasks();
  } catch (error) {
    showError(error.message);
  }
});

// Event delegation — handle toggle and delete button clicks on the task list
taskList.addEventListener('click', async (event) => {
  const target = event.target;

  // Toggle complete / undo
  if (target.classList.contains('toggle-btn')) {
    const id = Number(target.dataset.id);
    const currentlyCompleted = target.dataset.completed === 'true';

    try {
      await toggleTask(id, !currentlyCompleted);
      await loadTasks();
    } catch (error) {
      showError(error.message);
    }
  }

  // Delete
  if (target.classList.contains('delete-btn')) {
    const id = Number(target.dataset.id);

    try {
      await deleteTask(id);
      await loadTasks();
    } catch (error) {
      showError(error.message);
    }
  }
});

// ---------------------------------------------------------------------------
// Initial load — fetch and display tasks when the page loads
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', loadTasks);
