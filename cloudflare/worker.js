/* Seed Ordering Service sign-in.
   verifyMember hashes username + newline + password, the same way the
   GitHub Pages demo does. The member list stays on the server. */

function normaliseUser(username) {
  return String(username || "").trim().toLowerCase();
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCsv(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(",").map((part) => part.trim().replace(/^"|"$/g, "")));
}

async function loadMembers(env) {
  const members = [];
  if (!env.MEMBERS_CSV_URL) return members;
  const response = await fetch(env.MEMBERS_CSV_URL, { cf: { cacheTtl: 60 } });
  if (!response.ok) throw new Error("Member list could not be read");
  const rows = parseCsv(await response.text());
  const header = (rows[0] || []).map((cell) => cell.toLowerCase());
  const start = header.includes("name") ? 1 : 0;
  const hashCol = header.indexOf("hash");
  const userCol = header.indexOf("username");
  const passCol = header.indexOf("password");
  const nameCol = header.indexOf("name");
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const name = nameCol >= 0 ? row[nameCol] : row[row.length - 1];
    if (!name) continue;
    if (hashCol >= 0 && row[hashCol]) members.push({ hash: row[hashCol].toLowerCase(), name });
    else if (userCol >= 0 && passCol >= 0 && row[userCol] && row[passCol]) {
      members.push({ hash: await sha256Hex(normaliseUser(row[userCol]) + "\n" + row[passCol]), name });
    } else if (row[0] && /^[a-f0-9]{64}$/i.test(row[0])) members.push({ hash: row[0].toLowerCase(), name });
  }
  return members;
}

export async function verifyMember(username, password, env) {
  const user = normaliseUser(username);
  const pass = String(password || "");
  if (!user || !pass) return { ok: false };
  const hash = await sha256Hex(user + "\n" + pass);
  if (env.MEMBERS) {
    const name = await env.MEMBERS.get(hash);
    if (name) return { ok: true, name };
  }
  const found = (await loadMembers(env)).find((member) => member.hash === hash);
  if (!found) return { ok: false };
  return { ok: true, name: found.name };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || "*";
    if (request.method === "OPTIONS") return json({ ok: true }, 204, origin);
    const url = new URL(request.url);
    if (request.method !== "POST" || (url.pathname !== "/verify" && url.pathname !== "/")) {
      return json({ ok: false, error: "Not found" }, 404, origin);
    }
    let payload = {};
    try {
      payload = await request.json();
    } catch (e) {
      return json({ ok: false }, 400, origin);
    }
    let result;
    try {
      result = await verifyMember(payload.username, payload.password, env);
    } catch (e) {
      return json({ ok: false, error: "Member list unavailable" }, 503, origin);
    }
    if (!result.ok) return json({ ok: false }, 401, origin);
    return json({ ok: true, name: result.name }, 200, origin);
  },
};
