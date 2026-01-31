import axios from "axios";


const backendURL = import.meta.env.VITE_BACKEND_URL;

export const axiosInstance = axios.create({
  baseURL: `${backendURL}/api/v1`,
  withCredentials: true,
});

if (!import.meta.env.VITE_BACKEND_URL) {
  axiosInstance.defaults.baseURL = 'http://localhost:8080/api/v1';
}

let accessToken = null;
export const setAccessToken=function(token) {
  accessToken = token;
  axiosInstance.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined;
}

// queue for concurrent refreshes
let isRefreshing = false;
let subscribers = [];

function onRefreshed(token) {
  subscribers.forEach(cb => cb(token));
  subscribers = [];
}
function addSubscriber(cb) {
  subscribers.push(cb);
}

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    const noRefreshPaths = ['/auth/login', '/auth/register', '/auth/logout'];
    const isNoRefreshPath = noRefreshPaths.some(path => originalRequest.url?.includes(path));
    
    if (error.response && error.response.status === 401 && !originalRequest._retry && !isNoRefreshPath) {
      // attempt refresh
      if (isRefreshing) {
        // queue it
        return new Promise((resolve, reject) => {
          addSubscriber((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const resp = await axiosInstance.post('/auth/refresh'); 
        const newAccess = resp.data.accessToken;
        setAccessToken(newAccess);
        onRefreshed(newAccess);
        isRefreshing = false;
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        isRefreshing = false;
        setAccessToken(null);
        // Either send user to login or clear state
        // e.g. window.location.href = '/login';
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
 
);
