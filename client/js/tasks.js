// ============================================================
// tasks.js — Fonctionnalité 3 + Fonctionnalité 4 (assignation)
// ============================================================

let currentProjectId = null;
let projectMembers = [];

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('project');

  if (!currentProjectId) {
    document.getElementById('tasks-list').innerHTML =
      '<p>Sélectionnez un projet depuis <a href="projects.html">la liste des projets</a>.</p>';
    return;
  }

  await Promise.all([loadMembers(), loadTasks()]);
  setupForm();
}

// Charger les membres du projet pour le menu déroulant (Fonctionnalité 4)
async function loadMembers() {
  try {
    projectMembers = await api.request(`/projects/${currentProjectId}/members`);
    populateMemberSelect();
  } catch (err) {
    console.error('Erreur chargement membres:', err.message);
  }
}

function populateMemberSelect() {
  const select = document.getElementById('assignedTo');
  if (!select) return;
  select.innerHTML = '<option value="">-- Non assigné --</option>';
  projectMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m._id;
    opt.textContent = `${m.fullName} (${m.role === 'owner' ? 'Créateur' : 'Membre'})`;
    select.appendChild(opt);
  });
}

// Charger les tâches
async function loadTasks() {
  try {
    const tasks = await api.request(`/projects/${currentProjectId}/tasks`);
    renderTasks(tasks);
  } catch (err) {
    alert(err.message);
  }
}

function renderTasks(tasks) {
  const container = document.getElementById('tasks-list');
  if (!tasks.length) {
    container.innerHTML = '<p>Aucune tâche pour ce projet.</p>';
    return;
  }

  container.innerHTML = tasks.map(t => `
    <div class="task-card">
      <div>
        <strong>${t.title}</strong>
        <span class="priority-${t.priority}">[${t.priority.toUpperCase()}]</span>
        <span class="status-badge">${t.status}</span>
      </div>
      <div class="task-meta">
        ${t.description ? `<em>${t.description}</em>` : ''}
        <span>👤 ${t.assignedTo ? t.assignedTo.fullName : 'Non assigné'}</span>
      </div>
      <div class="task-actions">
        <button onclick="deleteTask('${t._id}')">🗑 Supprimer</button>
        <select onchange="updateStatus('${t._id}', this.value)">
          <option ${t.status === 'à faire' ? 'selected' : ''}>à faire</option>
          <option ${t.status === 'en cours' ? 'selected' : ''}>en cours</option>
          <option ${t.status === 'terminé' ? 'selected' : ''}>terminé</option>
        </select>
      </div>
    </div>
  `).join('');
}

// Formulaire de création de tâche
function setupForm() {
  const form = document.getElementById('task-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;
    const assignedTo = document.getElementById('assignedTo').value;

    try {
      await api.request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title, description, priority,
          status: 'à faire',
          project: currentProjectId,
          assignedTo: assignedTo || undefined
        })
      });
      form.reset();
      populateMemberSelect();
      await loadTasks();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function deleteTask(taskId) {
  if (!confirm('Supprimer cette tâche ?')) return;
  try {
    await api.request(`/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function updateStatus(taskId, newStatus) {
  try {
    await api.request(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', init);
