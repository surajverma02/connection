import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true, // send httpOnly cookie with every request
});

// Global response interceptor — redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Only redirect if not already on auth pages
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/signup';
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
