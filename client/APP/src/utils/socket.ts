import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket || !socket.connected) {
    socket = io('http://localhost:8000', {
      auth: { token: token || localStorage.getItem('ludo_token') || '' },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const token = localStorage.getItem('ludo_token');
  if (token) {
    socket = io('http://localhost:8000', {
      auth: { token },
      autoConnect: true,
      reconnection: true
    });
  }
  return socket;
}
