// F10 — Système de notifications côté client
const NOTIF_ARCHIVE_KEY = 'taskflow_notifications_read';

let notifications = [];

function getArchivedIds() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_ARCHIVE_KEY) || '[]');
  } catch { return []; }
}

function archiveNotification(id) {
  const archived = getArchivedIds();
  if (!archived.includes(id)) {
    archived.push(id);
    localStorage.setItem(NOTIF_ARCHIVE_KEY, JSON.stringify(archived));
  }
}

function updateBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const unread = notifications.filter(n => !n.read).length;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? 'inline-block' : 'none';
}

function renderDropdown() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const archived = getArchivedIds();
  const all = [
    ...notifications,
    ...archived.filter(id => !notifications.find(n => n._id === id))
      .map(id => ({ _id: id, message: '(archivée)', read: true, createdAt: null }))
  ];

  if (!all.length) {
    list.innerHTML = '<div style="padding:1rem;color:#888;font-size:0.85rem;">Aucune notification</div>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? 'read' : 'unread'}" id="notif-${n._id}">
      <div class="notif-msg">${n.message}</div>
      ${!n.read ? `<button class="notif-read-btn" onclick="markRead('${n._id}')">✓ Lu</button>` : '<span class="notif-read-label">Lu</span>'}
    </div>
  `).join('');
}

async function fetchNotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    notifications = await api.request('/notifications');
    updateBadge();
    renderDropdown();
  } catch (err) {
    console.error('Notifications error:', err.message);
  }
}

async function markRead(id) {
  try {
    await api.request(`/notifications/${id}/read`, { method: 'PATCH' });
    const notif = notifications.find(n => n._id === id);
    if (notif) notif.read = true;
    archiveNotification(id);
    updateBadge();
    renderDropdown();
  } catch (err) {
    console.error('markRead error:', err.message);
  }
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  if (dropdown.style.display === 'block') renderDropdown();
}

function initNotifications() {
  fetchNotifications();
  // Polling toutes les 30 secondes (F10)
  setInterval(fetchNotifications, 30000);
}

document.addEventListener('DOMContentLoaded', initNotifications);
