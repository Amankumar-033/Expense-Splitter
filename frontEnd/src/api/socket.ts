// The Socket.io server lives at the API host, just without the /api path.
// Deriving it from VITE_API_URL means there is only ever one URL to configure.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');
