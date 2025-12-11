import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Contacts API
export const contactsAPI = {
    getAll: (params) => api.get('/contacts', { params }),
    getById: (id) => api.get(`/contacts/${id}`),
    getByPhone: (phone) => api.get(`/contacts/by-phone/${encodeURIComponent(phone)}`),
    create: (data) => api.post('/contacts', data),
    update: (id, data) => api.put(`/contacts/${id}`, data),
    delete: (id) => api.delete(`/contacts/${id}`),
};

// Calls API
export const callsAPI = {
    getAll: (params) => api.get('/calls', { params }),
    getById: (id) => api.get(`/calls/${id}`),
    getStats: () => api.get('/calls/stats'),
    create: (data, callEventId = null) => {
        const params = callEventId ? { call_event_id: callEventId } : {};
        return api.post('/calls', data, { params });
    },
    update: (id, data) => api.put(`/calls/${id}`, data),
    exportCSV: (params) => {
        const queryString = new URLSearchParams(params).toString();
        const token = localStorage.getItem('token');
        return fetch(`${API_URL}/calls/export/csv?${queryString}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }).then((res) => res.blob());
    },
};

// Admin API
export const adminAPI = {
    // User management
    getUsers: (params) => api.get('/admin/users', { params }),
    getUser: (id) => api.get(`/admin/users/${id}`),
    createUser: (data) => api.post('/admin/users', data),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    resetPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),
    getStats: () => api.get('/admin/stats'),
};

// FreePBX API
export const freepbxAPI = {
    getCallEvents: (params) => api.get('/freepbx/call-events', { params }),
    getCallEvent: (id) => api.get(`/freepbx/call-events/${id}`),
    markProcessed: (id) => api.put(`/freepbx/call-events/${id}/mark-processed`),
    getPendingCalls: () => api.get('/freepbx/pending-calls'),
};

export default api;
