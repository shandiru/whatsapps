// Hardcoded API base URL — points at the local backend by default.
// Override by setting VITE_API_URL at build time, or edit this file.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_URL;
