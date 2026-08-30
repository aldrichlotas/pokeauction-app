import { io, Socket } from 'socket.io-client';

// Use the production backend URL if provided by Vite, otherwise default to local development port
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
});
