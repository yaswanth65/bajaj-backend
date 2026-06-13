const BASE = process.env.API_URL || "http://localhost:5000/api";

let pass = 0, fail = 0;

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function get(url, token) {
  const r = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}

async function put(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}

function test(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} — ${detail || ""}`); }
}

function summary() {
  console.log(`\nResults: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  process.exit(fail > 0 ? 1 : 0);
}

module.exports = { BASE, login, get, post, put, test, summary };
