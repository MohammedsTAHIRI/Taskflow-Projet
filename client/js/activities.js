//Fil d'activité du projet
const LABELS = {
  task_created:       (m) => `a créé la tâche "${m.taskTitle}"`,
  task_deleted:       (m) => `a supprimé la tâche "${m.taskTitle}"`,
  task_status_changed:(m) => `a changé le statut de "${m.taskTitle}" : ${m.from} → ${m.to}`,
  member_added:       (m) => `a ajouté ${m.memberName} (${m.memberEmail}) au projet`,
  member_removed:     (m) => `a retiré ${m.memberName} du projet`,
  project_updated:    (m) => `a modifié le projet`
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'il y a quelques secondes';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

async function loadActivities(projectId) {
  const container = document.getElementById('activity-feed');
  if (!container) return;
  try {
    const activities = await api.request(`/projects/${projectId}/activities`);
    if (!activities.length) {
      container.innerHTML = '<p style="color:#888;font-size:0.85rem;">Aucune activité pour ce projet.</p>';
      return;
    }
    container.innerHTML = activities.map(a => {
      const label = LABELS[a.type] ? LABELS[a.type](a.meta || {}) : a.type;
      return `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <strong>${a.user?.fullName || 'Utilisateur'}</strong> ${label}
            <span class="activity-time">${timeAgo(a.createdAt)}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Erreur: ${err.message}</p>`;
  }
}
