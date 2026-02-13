/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  // O SEGREDO: Se tiver variável da Vercel, usa ela. Senão, usa localhost.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

export default api;