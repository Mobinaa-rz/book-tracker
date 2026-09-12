import { api } from './client.js';

export const authApi = {
  register: (data) => api.post('/api/auth/register', data).then((r) => r.user),
  login: (data) => api.post('/api/auth/login', data).then((r) => r.user),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me').then((r) => r.user),
};
