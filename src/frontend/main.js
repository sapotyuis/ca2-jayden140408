const statusElement = document.getElementById('status');

const checkHealth = async () => {
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();

    if (!response.ok || payload.status !== 'ok') {
      throw new Error('Health check failed');
    }

    statusElement.textContent = 'Server status: online';
  } catch (error) {
    statusElement.textContent = 'Server status: unavailable';
  }
};

document.addEventListener('DOMContentLoaded', checkHealth);
