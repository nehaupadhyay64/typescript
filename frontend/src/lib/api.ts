import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((request) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});
