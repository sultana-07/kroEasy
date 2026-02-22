import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,  // 15s timeout — handles Render cold starts gracefully
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kroeasy_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('kroeasy_token');
            localStorage.removeItem('kroeasy_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
