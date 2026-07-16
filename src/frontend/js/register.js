import { registerRequest, getErrorMessage } from './auth.js';

const registerForm = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

const showError = (message) => {
  successMessage.hidden = true;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
};

const clearMessages = () => {
  errorMessage.hidden = true;
  successMessage.hidden = true;
};

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessages();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Please enter both a username and password.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const { ok, data } = await registerRequest(username, password);

    if (!ok) {
      showError(getErrorMessage(data));
      return;
    }

    successMessage.textContent = 'Account created! Redirecting to login...';
    successMessage.hidden = false;
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (error) {
    showError('Could not reach the server. Please try again.');
  } finally {
    submitButton.disabled = false;
  }
});
