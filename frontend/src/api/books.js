import { api } from './client.js';

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const booksApi = {
  list: ({ search = '', status = '' } = {}) =>
    api.get(`/api/books${query({ search, status })}`).then((r) => r.books),
  stats: () => api.get('/api/books/stats'),
  get: (id) => api.get(`/api/books/${id}`).then((r) => r.book),
  create: (data) => api.post('/api/books', data).then((r) => r.book),
  update: (id, data) => api.put(`/api/books/${id}`, data).then((r) => r.book),
  remove: (id) => api.delete(`/api/books/${id}`),
};
