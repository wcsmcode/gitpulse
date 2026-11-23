import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach Token if stored in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gitpulse_token') || localStorage.getItem('gitpulse_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401s cleanly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if invalid or revoked
      localStorage.removeItem('gitpulse_token');
      localStorage.removeItem('gitpulse_auth_token');
      window.dispatchEvent(new CustomEvent('gitpulse:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
