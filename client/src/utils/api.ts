const BASE = '/api';

// Reads the JWT from a cookie (mirrors AuthContext cookie helpers)
function getTokenFromCookie(): string {
  const entry = document.cookie
    .split('; ')
    .find(row => row.startsWith('ludo_token='));
  return entry ? decodeURIComponent(entry.split('=')[1]) : '';
}

interface RequestBody {
  [key: string]: unknown;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getTokenFromCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Request failed');
  return data;
}

export const authApi = {
  login:  (body: RequestBody) => apiFetch('/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
  signup: (body: RequestBody) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  me:     ()                  => apiFetch('/auth/me')
};

export const gameApi = {
  leaderboard: (params?: string) => apiFetch(`/game/leaderboard${params ? '?' + params : ''}`),
  history:     ()                => apiFetch('/game/history')
};

export const profileApi = {
  update: (body: RequestBody) => apiFetch('/profile/update', { method: 'PATCH', body: JSON.stringify(body) })
};
