let currentProjectId = null;
let projectMembers = [];
let currentPage = 1;
let totalPages = 1;

// Filtres actifs
let activeFilters = { status: '', priority: '', assignedTo: '', search: '' };

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
  setupFilters();
}

async function loadMembers() {
  try {
    projectMembers = await api.request(`/projects/${currentProjectId}/members`);
    populateMemberSelect();
    populateFilterMemberSelect();
  } catch (err) {
    console.error('Erreur membres:', err.message);
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

function populateFilterMemberSelect() {
  const select = document.getElementById('filter-member');
  if (!select) return;
  select.innerHTML = '<option value="">Tous les membres</option>';
  projectMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m._id;
    opt.textContent = m.fullName;
    select.appendChild(opt);
  });
}

async function loadTasks() {
  try {
    const params = new URLSearchParams({ page: currentPage, limit: 8 });
    if (activeFilters.status) params.append('status', activeFilters.status);
    if (activeFilters.priority) params.append('priority', activeFilters.priority);
    if (activeFilters.assignedTo) params.append('assignedTo', activeFilters.assignedTo);
    if (activeFilters.search) params.append('search', activeFilters.search);

    const data = await api.request(`/tasks/project/${currentProjectId}?${params}`);
    totalPages = data.totalPages || 1;
    renderTasks(data.data);
    renderPagination();
  } catch (err) {
    alert(err.message);
  }
}

function renderTasks(tasks) {
  const container = document.getElementById('tasks-list');
  if (!tasks.length) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:1rem;">Aucune tâche trouvée.</p>';
    return;
  }
  container.innerHTML = tasks.map(t => `
    <div class="task-card">
      <div>
        <strong>${t.title}</strong>
        <span class="priority-${t.priority}"> [${t.priority.toUpperCase()}]</span>
        <span class="status-badge">${t.status}</span>
      </div>
      ${t.description ? `<div class="task-meta"><em>${t.description}</em></div>` : ''}
      <div class="task-meta">
        👤 ${t.assignedTo ? t.assignedTo.fullName : 'Non assigné'}
        ${t.dueDate ? ` · 📅 ${new Date(t.dueDate).toLocaleDateString('fr-FR')}` : ''}
      </div>
      <div class="task-actions">
        <select onchange="updateStatus('${t._id}', this.value)">
          <option ${t.status==='à faire'?'selected':''}>à faire</option>
          <option ${t.status==='en cours'?'selected':''}>en cours</option>
          <option ${t.status==='terminé'?'selected':''}>terminé</option>
        </select>
        <button onclick="deleteTask('${t._id}')">🗑 Supprimer</button>
      </div>
    </div>
  `).join('');
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Préc.</button>
    <span>Page ${currentPage} / ${totalPages}</span>
    <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Suiv. →</button>
  `;
}

function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadTasks();
}

function setupFilters() {
  const searchInput = document.getElementById('filter-search');
  const statusSelect = document.getElementById('filter-status');
  const prioritySelect = document.getElementById('filter-priority');
  const memberSelect = document.getElementById('filter-member');
  const resetBtn = document.getElementById('filter-reset');

  const applyFilters = () => {
    currentPage = 1;
    activeFilters.search = searchInput ? searchInput.value.trim() : '';
    activeFilters.status = statusSelect ? statusSelect.value : '';
    activeFilters.priority = prioritySelect ? prioritySelect.value : '';
    activeFilters.assignedTo = memberSelect ? memberSelect.value : '';
    loadTasks();
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyFilters);
  if (prioritySelect) prioritySelect.addEventListener('change', applyFilters);
  if (memberSelect) memberSelect.addEventListener('change', applyFilters);
  if (resetBtn) resetBtn.addEventListener('click', () => {
    activeFilters = { status: '', priority: '', assignedTo: '', search: '' };
    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = '';
    if (prioritySelect) prioritySelect.value = '';
    if (memberSelect) memberSelect.value = '';
    currentPage = 1;
    loadTasks();
  });
}

function setupForm() {
  const form = document.getElementById('task-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('task-title').value,
          description: document.getElementById('task-description').value,
          priority: document.getElementById('task-priority').value,
          status: 'à faire',
          project: currentProjectId,
          assignedTo: document.getElementById('assignedTo').value || undefined
        })
      });
      form.reset();
      populateMemberSelect();
      currentPage = 1;
      await loadTasks();
    } catch (err) { alert(err.message); }
  });
}

async function deleteTask(taskId) {
  if (!confirm('Supprimer cette tâche ?')) return;
  try {
    await api.request(`/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) { alert(err.message); }
}

async function updateStatus(taskId, status) {
  try {
    await api.request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadTasks();
  } catch (err) { alert(err.message); }
}

document.addEventListener('DOMContentLoaded', init);
