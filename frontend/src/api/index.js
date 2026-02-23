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
        // Only force-redirect to /login if the user HAD a valid token that expired.
        // Do NOT redirect during login/register attempts (no token = they're already on login page).
        const hadToken = !!localStorage.getItem('kroeasy_token');
        if (hadToken && error.response?.status === 401) {
            localStorage.removeItem('kroeasy_token');
            localStorage.removeItem('kroeasy_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
