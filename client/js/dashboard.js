async function loadDashboard() {
  try {
    const data = await api.request('/dashboard');
    
    // Métriques
    document.getElementById('active-projects').textContent = data.metrics.activeProjects;
    document.getElementById('assigned-tasks').textContent = data.metrics.assignedTasks;
    document.getElementById('completed-tasks').textContent = data.metrics.completedTasks;
    document.getElementById('late-tasks').textContent = data.metrics.lateTasks;

    // Tâches en cours
    const container = document.getElementById('ongoing-tasks');
    if (!data.ongoingTasks.length) {
      container.innerHTML = '<p>Aucune tâche en cours.</p>';
      return;
    }

    container.innerHTML = data.ongoingTasks.map(t => `
      <div class="task-item">
        <div>
          <strong>${t.title}</strong> — ${t.project?.title || 'Projet inconnu'}
          <span class="priority-${t.priority}">[${t.priority.toUpperCase()}]</span>
        </div>
        <div>
          ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Sans deadline'} — 
          <em>${t.status}</em>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
