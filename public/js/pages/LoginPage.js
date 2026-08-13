import { createClassNames } from '../lib/classNames.js';
import { escapeHtml } from '../lib/dom.js';
import { renderAuthShell } from './authShell.js';

const form = createClassNames('auth-form');
const buttonStyles = createClassNames('button');

export const renderLoginPage = ({ root, auth, worldClock }) => {
  if (auth.getState().isAuthed) {
    window.location.replace('/html/camp.html');
    return () => {};
  }
  const view = renderAuthShell({
    root, auth, worldClockStore: worldClock,
    status: 'Sign in to your survivor account',
    title: 'Sign in to Castaway Chronicles',
    lede: 'Enter your survivor name and password to continue.',
    content: `<form data-login-form autocomplete="off" novalidate><div class="${form.field}"><label for="username">Survivor name</label><input class="${form.input}" id="username" name="username" type="text" placeholder="Enter your survivor name" autocomplete="off" required></div><div class="${form.field}"><label for="password">Password</label><input class="${form.input}" id="password" name="password" type="password" placeholder="Enter your password" autocomplete="off" required></div><p class="${form.message} ${form.error}" data-form-error role="alert" hidden></p><button type="submit" data-login-submit class="${buttonStyles.btn} ${buttonStyles.lantern} ${buttonStyles.lg} ${form.submit}">SIGN IN</button></form>`,
    footer: `New player? <a href="/html/register.html">Create a survivor account.</a><br><a href="/html/leaderboard.html">View the public leaderboard.</a>`,
  });
  const loginForm = view.shell.querySelector('[data-login-form]');
  const submit = view.shell.querySelector('[data-login-submit]');
  const errorNode = view.shell.querySelector('[data-form-error]');
  const onSubmit = async (event) => {
    event.preventDefault();
    const username = loginForm.elements.username.value.trim();
    const password = loginForm.elements.password.value;
    errorNode.hidden = true;
    if (!username || !password) {
      errorNode.textContent = 'Please enter both a username and password.';
      errorNode.hidden = false;
      return;
    }
    submit.disabled = true;
    try {
      const result = await auth.login(username, password);
      if (!result.ok) {
        errorNode.textContent = result.message;
        errorNode.hidden = false;
        return;
      }
      window.location.replace('/html/camp.html');
    } catch (error) {
      console.error('[AUTH] login page request failed', { message: error.message || String(error) });
      errorNode.textContent = 'Could not reach the server. Please try again.';
      errorNode.hidden = false;
    } finally {
      submit.disabled = false;
    }
  };
  loginForm.addEventListener('submit', onSubmit);
  return () => { loginForm.removeEventListener('submit', onSubmit); view.dispose(); };
};
