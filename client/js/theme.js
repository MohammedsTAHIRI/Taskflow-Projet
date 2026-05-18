// ── Theme Manager (Dark / Light) ──
(function () {
  const STORAGE_KEY = 'taskflow_theme';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    // Update all toggle buttons on the page
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.title = theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair';
    });
  }

  function toggleTheme() {
    const current = localStorage.getItem(STORAGE_KEY) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // Apply saved theme immediately (before DOM paint)
  const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
  applyTheme(saved);

  // Expose globally
  window.toggleTheme = toggleTheme;

  // Wait for DOM then wire up buttons
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem(STORAGE_KEY) || 'dark');
  });
})();
