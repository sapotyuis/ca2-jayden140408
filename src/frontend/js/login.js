import { loginRequest, getCurrentUser, saveSession, getToken, getErrorMessage } from './auth.js';

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Where a signed-in survivor belongs. index.html IS the login page, so redirecting
// there would loop — the game view lives on its own page (built in Phase 3).
const GAME_PAGE = 'game.html';

// Already logged in — skip the form and go straight to the raft.
if (getToken()) {
  window.location.href = GAME_PAGE;
}

const showError = (message) => {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
};

const clearError = () => {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Please enter both a username and password.');
    return;
  }

  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const { ok, data } = await loginRequest(username, password);

    if (!ok) {
      showError(getErrorMessage(data));
      return;
    }

    const user = await getCurrentUser(data.token);
    saveSession(data.token, user);
    window.location.href = GAME_PAGE;
  } catch (error) {
    showError('Could not reach the server. Please try again.');
  } finally {
    submitButton.disabled = false;
  }
});
