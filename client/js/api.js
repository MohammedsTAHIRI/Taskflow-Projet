const API_URL = 'http://localhost:5000/api';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || 'Erreur serveur');
    return data;
  },

  // Auth
  register: (userData) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  
  // Route protégée exemple
  getMe: () => api.request('/auth/me')
};
