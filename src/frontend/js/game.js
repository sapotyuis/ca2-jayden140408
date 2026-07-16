import { getToken } from './auth.js';

// Page protection: without a token there is no session, so send the visitor
// back to sign in before anything else runs.
if (!getToken()) {
  window.location.replace('index.html');
}

// saveSession() stored the public user object under 'user' at login time.
const user = JSON.parse(localStorage.getItem('user') || 'null');
const nameEl = document.getElementById('survivor-name');
if (nameEl && user && user.username) {
  nameEl.textContent = user.username;
}

// Log out: clear the session and return to the login page.
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});
