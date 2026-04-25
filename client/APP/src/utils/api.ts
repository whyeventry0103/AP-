const BASE = '/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('ludo_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const authApi = {
  login: (body: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  signup: (body: any) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me')
};

export const gameApi = {
  leaderboard: (params?: string) => apiFetch(`/game/leaderboard${params ? '?' + params : ''}`),
  history: () => apiFetch('/game/history')
};

export const profileApi = {
  update: (body: any) => apiFetch('/profile/update', { method: 'PATCH', body: JSON.stringify(body) })
};
