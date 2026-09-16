import { api } from './client.js';

export const calendarApi = {
  /**
   * Reading events between two inclusive 'YYYY-MM-DD' dates.
   * Resolves to { from, to, events, summary }.
   */
  range: ({ from, to }) => api.get(`/api/calendar?${new URLSearchParams({ from, to })}`),
};
