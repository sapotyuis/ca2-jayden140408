import form from '../../css/authForm.module.css';
import buttonStyles from '../../css/Button.module.css';
import { renderAuthShell } from './authShell';

export const renderRegisterPage = ({ root, auth, worldClock }) => {
  const view = renderAuthShell({
    root, auth, worldClockStore: worldClock, tone: 'dawn',
    status: 'Create a new survivor account',
    title: 'Create your survivor account',
    lede: 'Create an account to start playing.',
    content: `<form data-register-form autocomplete="off" novalidate><div class="${form.field}"><label for="username">Survivor name</label><input class="${form.input}" id="username" name="username" type="text" placeholder="Enter your survivor name" autocomplete="off" required></div><div class="${form.field}"><label for="password">Password</label><input class="${form.input}" id="password" name="password" type="password" placeholder="Enter a password" autocomplete="off" minlength="6" required><p class="${form.hint}">Password must be at least 6 characters.</p></div><p class="${form.message} ${form.error}" data-form-error role="alert" hidden></p><p class="${form.message} ${form.success}" data-form-success role="status" hidden></p><button type="submit" data-register-submit class="${buttonStyles.btn} ${buttonStyles.lantern} ${buttonStyles.lg} ${form.submit}">CREATE ACCOUNT</button></form>`,
    footer: `Already have an account? <a href="/login.html">Sign in.</a>`,
  });
  const registerForm = view.shell.querySelector('[data-register-form]');
  const submit = view.shell.querySelector('[data-register-submit]');
  const errorNode = view.shell.querySelector('[data-form-error]');
  const successNode = view.shell.querySelector('[data-form-success]');
  const onSubmit = async (event) => {
    event.preventDefault();
    const username = registerForm.elements.username.value.trim();
    const password = registerForm.elements.password.value;
    errorNode.hidden = true;
    successNode.hidden = true;
    if (!username || !password) {
      errorNode.textContent = 'Please enter both a username and password.';
      errorNode.hidden = false;
      return;
    }
    if (password.length < 6) {
      errorNode.textContent = 'Password must be at least 6 characters.';
      errorNode.hidden = false;
      return;
    }
    submit.disabled = true;
    try {
      const result = await auth.register(username, password);
      if (!result.ok) {
        errorNode.textContent = result.message;
        errorNode.hidden = false;
        return;
      }
      successNode.textContent = 'Account created. Redirecting to sign in…';
      successNode.hidden = false;
      window.setTimeout(() => window.location.replace('/login.html'), 1200);
    } catch (error) {
      console.error('[AUTH] registration page request failed', { message: error.message || String(error) });
      errorNode.textContent = 'Could not reach the server. Please try again.';
      errorNode.hidden = false;
    } finally {
      submit.disabled = false;
    }
  };
  registerForm.addEventListener('submit', onSubmit);
  return () => { registerForm.removeEventListener('submit', onSubmit); view.dispose(); };
};
