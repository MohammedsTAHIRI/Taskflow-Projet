// Vérifier la session au chargement
function checkSession() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token) {
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
      window.location.href = 'login.html';
    }
    return;
  }

  // Afficher l'utilisateur connecté
  const userDisplay = document.getElementById('user-display');
  if (userDisplay && user) {
    userDisplay.textContent = `Connecté : ${user.fullName}`;
  }
}

// Connexion
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  } catch (err) {
    alert(err.message);
  }
}

// Inscription
async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await api.register({ fullName, email, password });
    alert('Compte créé ! Connectez-vous.');
    window.location.href = 'login.html';
  } catch (err) {
    alert(err.message);
  }
}

// Déconnexion
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  checkSession();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
