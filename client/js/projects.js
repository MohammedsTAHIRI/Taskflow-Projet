let currentPage = 1;

async function loadProjects(page = 1) {
  currentPage = page;
  try {
    const data = await api.request(`/projects?page=${page}&limit=5`);
    renderProjects(data.data);
    renderPagination(data.totalPages, data.page);
  } catch (err) {
    alert(err.message);
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projects-list');
  if (!projects.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">Aucun projet trouvé.</p>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-info">
        <h3>${p.title}</h3>
        <p>${p.description || 'Pas de description'} —
           <strong>${p.status}</strong> —
           ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'Sans deadline'}</p>
      </div>
      <div class="project-actions">
        <a href="tasks.html?project=${p._id}" class="btn btn-tasks">Voir les tâches</a>
        <button class="btn-edit" onclick="editProject('${p._id}', '${p.title}', '${p.description||''}', '${p.deadline||''}', '${p.status}')">Modifier</button>
        <button class="btn-delete" onclick="deleteProject('${p._id}')">Supprimer</button>
      </div>
    </div>
  `).join('');
}

function renderPagination(totalPages, page) {
  const container = document.getElementById('pagination');
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === page ? 'active' : ''}" onclick="loadProjects(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

function openModal() {
  document.getElementById('project-form').reset();
  document.getElementById('project-id').value = '';
  document.getElementById('modal-title').textContent = 'Nouveau Projet';
  document.getElementById('project-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('project-modal').classList.remove('active');
}

function editProject(id, title, description, deadline, status) {
  document.getElementById('project-id').value = id;
  document.getElementById('title').value = title;
  document.getElementById('description').value = description;
  document.getElementById('deadline').value = deadline ? deadline.split('T')[0] : '';
  document.getElementById('status').value = status;
  document.getElementById('modal-title').textContent = 'Modifier Projet';
  document.getElementById('project-modal').classList.add('active');
}

async function deleteProject(id) {
  if (!confirm('Supprimer ce projet et toutes ses tâches ?')) return;
  try {
    await api.request(`/projects/${id}`, { method: 'DELETE' });
    loadProjects(currentPage);
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const body = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    deadline: document.getElementById('deadline').value || undefined,
    status: document.getElementById('status').value
  };

  try {
    if (id) {
      await api.request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api.request('/projects', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    loadProjects(currentPage);
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener('DOMContentLoaded', () => loadProjects());
