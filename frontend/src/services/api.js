import { API_BASE_URL } from "../config";
import { apiFetch } from "../utils/apiFetch";

/**
 * Centralised API endpoint definitions.
 * Every URL is a named function so callers don't build URL strings by hand.
 */
export const endpoints = {
  users: {
    register: () => `${API_BASE_URL}/users/register`,
    login: () => `${API_BASE_URL}/users/login`,
    login2FA: () => `${API_BASE_URL}/users/login/2fa`,
    logout: () => `${API_BASE_URL}/users/logout`,
    refresh: () => `${API_BASE_URL}/users/refresh`,
    me: () => `${API_BASE_URL}/users/me`,
    profile: () => `${API_BASE_URL}/users/profile`,
    password: () => `${API_BASE_URL}/users/password`,
    activityLog: (limit) => `${API_BASE_URL}/users/activity-log?limit=${limit || 30}`,
  },
  twoFA: {
    setup: () => `${API_BASE_URL}/2fa/setup`,
    enable: () => `${API_BASE_URL}/2fa/enable`,
    disable: () => `${API_BASE_URL}/2fa/disable`,
  },
  activities: {
    list: (year, month) => `${API_BASE_URL}/activities?year=${year}&month=${month}`,
    create: () => `${API_BASE_URL}/activities`,
    update: (id) => `${API_BASE_URL}/activities/${id}`,
    delete: (id) => `${API_BASE_URL}/activities/${id}`,
    reorder: () => `${API_BASE_URL}/activities/reorder`,
    importPrevious: () => `${API_BASE_URL}/activities/import-previous-month`,
    hasRoutines: (year, month) =>
      `${API_BASE_URL}/activities/previous-month-has-routines?year=${year}&month=${month}`,
  },
  completions: {
    monthly: (year, month) => `${API_BASE_URL}/completions/monthly?year=${year}&month=${month}`,
    update: () => `${API_BASE_URL}/completions/update`,
    summary: (date) => `${API_BASE_URL}/completions/summary?date=${date}`,
    statistics: (year, month) =>
      `${API_BASE_URL}/completions/statistics?year=${year}&month=${month}`,
    streaks: (activityId) => `${API_BASE_URL}/completions/streaks/${activityId}`,
  },
  notes: {
    list: (params) => `${API_BASE_URL}/notes?${new URLSearchParams(params || {})}`,
    get: (id) => `${API_BASE_URL}/notes/${id}`,
    create: () => `${API_BASE_URL}/notes`,
    update: (id) => `${API_BASE_URL}/notes/${id}`,
    delete: (id) => `${API_BASE_URL}/notes/${id}`,
    categories: () => `${API_BASE_URL}/notes/categories`,
    upload: () => `${API_BASE_URL}/notes/upload`,
    attachment: (id) => `${API_BASE_URL}/notes/attachments/${id}`,
    answers: {
      create: (noteId) => `${API_BASE_URL}/notes/${noteId}/answers`,
      update: (id) => `${API_BASE_URL}/notes/answers/${id}`,
      delete: (id) => `${API_BASE_URL}/notes/answers/${id}`,
      toggleVeryGood: (id) => `${API_BASE_URL}/notes/answers/${id}/toggle-very-good`,
    },
  },
  books: {
    list: () => `${API_BASE_URL}/books`,
    upload: () => `${API_BASE_URL}/books`,
    delete: (id) => `${API_BASE_URL}/books/${id}`,
    file: (id) => `${API_BASE_URL}/books/${id}/file`,
    progress: (id) => `${API_BASE_URL}/books/${id}/progress`,
    cover: (id) => `${API_BASE_URL}/books/${id}/cover`,
    readingGoal: () => `${API_BASE_URL}/books/reading-goal`,
    dashboardSummary: () => `${API_BASE_URL}/books/dashboard-summary`,
    notesSummary: () => `${API_BASE_URL}/books/notes-summary`,
    randomPageNote: () => `${API_BASE_URL}/books/random-page-note`,
    favouriteNotes: () => `${API_BASE_URL}/books/favourite-notes`,
    highlights: (id) => `${API_BASE_URL}/books/${id}/highlights`,
    deleteHighlight: (id) => `${API_BASE_URL}/books/highlights/${id}`,
    pageNotes: (id) => `${API_BASE_URL}/books/${id}/page-notes-all`,
    getPageNotes: (id, page) => `${API_BASE_URL}/books/${id}/page-notes/${page}`,
    createPageNote: (id) => `${API_BASE_URL}/books/${id}/page-notes`,
    updatePageNote: (id) => `${API_BASE_URL}/books/page-notes/${id}`,
    deletePageNote: (id) => `${API_BASE_URL}/books/page-notes/${id}`,
    toggleFavouriteNote: (id) => `${API_BASE_URL}/books/page-notes/${id}/favourite`,
    favouritePages: (id) => `${API_BASE_URL}/books/${id}/favourite-pages`,
    toggleFavouritePage: (id) => `${API_BASE_URL}/books/${id}/favourite-pages`,
  },
  expenses: {
    list: (month, year) => `${API_BASE_URL}/expenses?month=${month}&year=${year}`,
    create: () => `${API_BASE_URL}/expenses`,
    update: (id) => `${API_BASE_URL}/expenses/${id}`,
    delete: (id) => `${API_BASE_URL}/expenses/${id}`,
    budget: () => `${API_BASE_URL}/expenses/budget`,
  },
  stickyNotes: {
    list: () => `${API_BASE_URL}/sticky-notes`,
    create: () => `${API_BASE_URL}/sticky-notes`,
    update: (id) => `${API_BASE_URL}/sticky-notes/${id}`,
    delete: (id) => `${API_BASE_URL}/sticky-notes/${id}`,
  },
  qazaNamaz: {
    get: () => `${API_BASE_URL}/qaza-namaz`,
    save: () => `${API_BASE_URL}/qaza-namaz`,
  },
  monthlyTodos: {
    list: () => `${API_BASE_URL}/monthly-todos`,
    create: () => `${API_BASE_URL}/monthly-todos`,
    update: (id) => `${API_BASE_URL}/monthly-todos/${id}`,
    delete: (id) => `${API_BASE_URL}/monthly-todos/${id}`,
    reorder: () => `${API_BASE_URL}/monthly-todos/reorder`,
  },
  favouriteProfiles: {
    list: () => `${API_BASE_URL}/favourite-profiles`,
    create: () => `${API_BASE_URL}/favourite-profiles`,
    update: (id) => `${API_BASE_URL}/favourite-profiles/${id}`,
    delete: (id) => `${API_BASE_URL}/favourite-profiles/${id}`,
    records: (id) => `${API_BASE_URL}/favourite-profiles/${id}/records`,
    upsertRecord: (id) => `${API_BASE_URL}/favourite-profiles/${id}/records`,
    categories: (id) => `${API_BASE_URL}/favourite-profiles/${id}/categories`,
    createCategory: (id) => `${API_BASE_URL}/favourite-profiles/${id}/categories`,
    deleteCategory: (id) => `${API_BASE_URL}/favourite-profiles/categories/${id}`,
    updateCategory: (id) => `${API_BASE_URL}/favourite-profiles/categories/${id}`,
    deleteRecord: (id) => `${API_BASE_URL}/favourite-profiles/records/${id}`,
  },
  tasks: {
    list: (date) => `${API_BASE_URL}/tasks?date=${date}`,
    create: () => `${API_BASE_URL}/tasks`,
    update: (id) => `${API_BASE_URL}/tasks/${id}`,
    delete: (id) => `${API_BASE_URL}/tasks/${id}`,
  },
};

/**
 * Convenience wrapper — calls apiFetch with the auth context.
 * Usage:  const { data, error } = await api.get(endpoints.activities.list(2024, 3));
 */
export function createApi(auth) {
  const { token, refreshTokens, logout } = auth;
  const wrap = async (url, options = {}) =>
    apiFetch(url, options, { token, refreshTokens, logout });

  return {
    get: (url, opts) => wrap(url, { ...opts, method: "GET" }),
    post: (url, body, opts) =>
      wrap(url, { ...opts, method: "POST", body: JSON.stringify(body) }),
    put: (url, body, opts) =>
      wrap(url, { ...opts, method: "PUT", body: JSON.stringify(body) }),
    patch: (url, body, opts) =>
      wrap(url, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
    delete: (url, opts) => wrap(url, { ...opts, method: "DELETE" }),
  };
}
