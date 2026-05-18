async function loadDashboard() {
  try {
    const data = await api.request('/dashboard');

    const metrics = data.metrics || {};
    document.getElementById('active-projects').textContent = metrics.activeProjects ?? 0;
    document.getElementById('assigned-tasks').textContent  = metrics.assignedTasks  ?? 0;
    document.getElementById('completed-tasks').textContent = metrics.completedTasks ?? 0;
    document.getElementById('late-tasks').textContent      = metrics.lateTasks      ?? 0;

    const container = document.getElementById('ongoing-tasks');
    const tasks = data.ongoingTasks || [];

    if (!tasks.length) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:.5rem 0">Aucune tâche en cours.</p>';
      return;
    }

    const priorityLabel = { haute: '🔴 HAUTE', moyenne: '🟡 MOYENNE', basse: '🟢 BASSE' };

    container.innerHTML = tasks.map(t => {
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : 'Sans date limite';
      const projectTitle = t.project?.title || 'Projet inconnu';
      const assignee = t.assignedToUser?.fullName || '';
      return `
        <div class="task-item">
          <div>
            <strong style="color:var(--light)">${t.title}</strong>
            <span style="color:var(--text-muted);margin:0 6px">—</span>
            <span style="color:var(--text-muted)">${projectTitle}</span>
            <span class="priority-${t.priority}" style="margin-left:8px">${priorityLabel[t.priority] || t.priority}</span>
            ${assignee ? `<span style="color:var(--text-muted);font-size:.85rem;margin-left:8px">👤 ${assignee}</span>` : ''}
          </div>
          <div style="font-size:.9rem;color:var(--text-muted)">
            📅 ${due}
            <em style="margin-left:8px">${t.status}</em>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Dashboard error:', err);
    // Si le token est expiré → rediriger vers la page de connexion
    if (err.message && (err.message.includes('Token') || err.message.includes('401') || err.message.includes('Accès refusé'))) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }
    const container = document.getElementById('ongoing-tasks');
    if (container) container.innerHTML = `<p style="color:var(--danger);padding:.5rem 0">⚠️ ${err.message || 'Impossible de charger les données. Vérifiez que le serveur est lancé.'}</p>`;
    // Remettre les métriques à zéro en cas d'erreur
    ['active-projects','assigned-tasks','completed-tasks','late-tasks'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
