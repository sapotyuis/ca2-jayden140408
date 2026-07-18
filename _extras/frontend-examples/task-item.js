// 📋 EXAMPLE FILE — use this as a reference when creating reusable UI components.

/**
 * Task Item Component
 *
 * A reusable function that creates a list item element for a single task.
 * This demonstrates a simple component pattern using vanilla JavaScript:
 *
 *   1. A function receives data (the task object)
 *   2. It builds DOM elements from that data
 *   3. It returns the finished element so the caller can append it anywhere
 *
 * This pattern keeps your rendering logic in one place and makes it easy
 * to reuse the same UI piece across different pages or sections.
 *
 * Usage:
 *   import { createTaskItem } from '../components/task-item.js';
 *
 *   const li = createTaskItem(task, {
 *     onToggle: (id, completed) => { ... },
 *     onDelete: (id) => { ... },
 *   });
 *   document.getElementById('task-list').appendChild(li);
 */

/**
 * Create a list item element for a single task.
 *
 * @param {Object} task - A task object from the API.
 * @param {number} task.id - The task ID.
 * @param {string} task.title - The task title.
 * @param {boolean} task.completed - Whether the task is completed.
 * @param {Object} callbacks - Event handler callbacks.
 * @param {Function} callbacks.onToggle - Called with (id, newCompleted) when the toggle button is clicked.
 * @param {Function} callbacks.onDelete - Called with (id) when the delete button is clicked.
 * @returns {HTMLLIElement} The constructed list item element.
 */
export const createTaskItem = (task, { onToggle, onDelete }) => {
  // Create the <li> wrapper
  const li = document.createElement('li');

  // Add 'completed' class when the task is done (used for styling)
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
  toggleBtn.addEventListener('click', () => {
    onToggle(task.id, !task.completed);
  });

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-btn');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    onDelete(task.id);
  });

  // Assemble the element
  li.appendChild(span);
  li.appendChild(toggleBtn);
  li.appendChild(deleteBtn);

  return li;
};
