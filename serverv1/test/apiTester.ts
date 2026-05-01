// Run: npm run test  (or: ts-node test/apiTester.ts)
// Requires server to be running on port 8001

const BASE = 'http://localhost:8001/api';

// async function req(method: string, path: string, body?: any, token?: string) {
//   const res = await fetch(`${BASE}${path}`, {
//     method,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: body ? JSON.stringify(body) : undefined,
//   });
//   const data = await res.json().catch(() => ({}));
//   const status = res.ok ? '✓' : '✗';
//   console.log(`${status} [${res.status}] ${method} ${path}`);
//   if (!res.ok) console.log('   Error:', (data as any).message);
//   return { status: res.status, data };
// }

async function req(method: string, path: string, body?: any, token?: string) {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log('\n==================================================');
  console.log(`➡️ REQUEST: ${method} ${url}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  if (body) console.log('Body:', JSON.stringify(body, null, 2));
  console.log('--------------------------------------------------');

  const startTime = Date.now();
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const duration = Date.now() - startTime;
  
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  const statusIcon = res.ok ? '✅' : '❌';
  console.log(`⬅️ RESPONSE: ${statusIcon} [${res.status} ${res.statusText}] (${duration}ms)`);
  console.log('Body:', JSON.stringify(data, null, 2));
  console.log('==================================================');

  return { status: res.status, data };
}

async function runTests() {
  console.log('=== API Test Suite ===\n');
  const ts = Date.now();

  // ── AUTH ──────────────────────────────────────────────────────────────────
  console.log('-- Auth --');
  const { data: signupData } = await req('POST', '/auth/signup', {
    username: `user${ts}`,
    email:    `user${ts}@test.com`,
    password: 'password123',
  });
  const token    = (signupData as any).token;
  const userEmail = `user${ts}@test.com`;
  console.log('  token:', token ? 'received' : 'MISSING — auth will fail\n');

  const { data: loginData } = await req('POST', '/auth/login', {
    email: userEmail,
    password: 'password123',
  });
  const loginToken = (loginData as any).token ?? token;

  await req('GET', '/auth/me', undefined, loginToken);

  // ── USERS & STATS ─────────────────────────────────────────────────────────
  console.log('\n-- Users & Stats --');
  await req('GET', '/users/leaderboard', undefined, loginToken);
  await req('GET', '/users/history',     undefined, loginToken);
  await req('GET', '/stats',             undefined, loginToken);

  // ── UPDATE PROFILE ────────────────────────────────────────────────────────
  console.log('\n-- Update Profile --');
  await req('PUT', '/auth/update', { username: `user${ts}_updated` }, loginToken);

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  console.log('\n-- Logout --');
  await req('POST', '/auth/logout');

  // ── UNAUTHORIZED CHECK ────────────────────────────────────────────────────
  console.log('\n-- Auth guard --');
  await req('GET', '/auth/me'); // should return 401

  console.log('\n=== Done ===');
}

runTests().catch(console.error);
