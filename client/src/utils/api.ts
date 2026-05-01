const BASE = '/api';

function getTokenFromCookie(): string {
  const entry = document.cookie
    .split('; ')
    .find(row => row.startsWith('ludo_token='));
  return entry ? decodeURIComponent(entry.split('=')[1]) : '';
}

interface RequestBody {
  [key: string]: unknown;
}

// ── Response shape interfaces (kept in sync with server controllers) ──────────
interface UserPayload {
  _id: string;
  username: string;
  coins: number;
  total_played: number;
  dob: string;
  createdAt: string;
}

export interface AuthResponse   { token: string; user: UserPayload; }
export interface MeResponse     { user: UserPayload; }

export interface LeaderboardResponse {
  users: { _id: string; username: string; coins: number; total_played: number }[];
  total: number;
  page:  number;
  pages: number;
}

export interface HistoryResponse {
  history: {
    gameId:         string;
    date:           string;
    total_players:  number;
    players:        { username: string; color: string; rank: number | null }[];
    finishingOrder?: string[];
    myRank:         number | null;
    coinsEarned:    number;
  }[];
}

export interface ProfileResponse { user: UserPayload; }
// ─────────────────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getTokenFromCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({})) as unknown as T;
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Request failed');
  return data;
}

export const authApi = {
  login:  (body: RequestBody) => apiFetch<AuthResponse>('/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
  signup: (body: RequestBody) => apiFetch<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  me:     ()                  => apiFetch<MeResponse>('/auth/me')
};

export const gameApi = {
  leaderboard: (params?: string) => apiFetch<LeaderboardResponse>(`/game/leaderboard${params ? '?' + params : ''}`),
  history:     ()                => apiFetch<HistoryResponse>('/game/history')
};

export const profileApi = {
  update: (body: RequestBody) => apiFetch<ProfileResponse>('/profile/update', { method: 'PATCH', body: JSON.stringify(body) })
};
