/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  // Define o link do Backend (Local ou Vercel)
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Antes de qualquer pedido sair, esse código roda:
api.interceptors.request.use((config) => {
  // 1. Busca o token que salvamos no Login
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;