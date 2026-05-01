import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getTokenFromCookie(): string {
  const entry = document.cookie
    .split('; ')
    .find(row => row.startsWith('ludo_token='));
  return entry ? decodeURIComponent(entry.split('=')[1]) : '';
}

export function getSocket(): Socket {
  // Only create a new socket if none exists — never replace a reconnecting socket
  if (!socket) {
    socket = io('http://localhost:8000', {
      auth: { token: getTokenFromCookie() },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
