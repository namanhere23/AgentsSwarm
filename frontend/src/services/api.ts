// STUB-FILL — Implemented by: workstream/1c-frontend-foundation
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { getAuth, onIdTokenChanged } from 'firebase/auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401 token expiry automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        try {
          const newToken = await user.getIdToken(true);
          useAuthStore.getState().login(newToken, user.uid);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Sync Firebase Authentication Listener to keep Zustand store current
const auth = getAuth();
onIdTokenChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    useAuthStore.getState().login(token, user.uid);
  } else {
    useAuthStore.getState().logout();
  }
});

export default api;
