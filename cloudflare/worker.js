/* Seed Ordering Service member check.
   verifyMember is the same kind of check the GitHub Pages demo runs in the
   browser. Here it runs on the server, so the member list is not shipped to
   every visitor. Prefer SHA-256 hashes over plain codes in KV or in a sheet. */

function normalise(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
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
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
      return parts;
    });
}

async function loadMembers(env) {
  const members = [];
  if (env.MEMBERS_CSV_URL) {
    const response = await fetch(env.MEMBERS_CSV_URL, { cf: { cacheTtl: 60 } });
    if (!response.ok) throw new Error("Member list could not be read");
    const rows = parseCsv(await response.text());
    const header = (rows[0] || []).map((cell) => cell.toLowerCase());
    const start = header.includes("name") ? 1 : 0;
    const hashCol = header.indexOf("hash");
    const codeCol = header.indexOf("code");
    const nameCol = header.indexOf("name");
    for (let i = start; i < rows.length; i++) {
      const row = rows[i];
      const name = nameCol >= 0 ? row[nameCol] : row[1];
      if (!name) continue;
      if (hashCol >= 0 && row[hashCol]) members.push({ hash: row[hashCol].toLowerCase(), name });
      else if (codeCol >= 0 && row[codeCol]) members.push({ hash: await sha256Hex(normalise(row[codeCol])), name });
      else if (row[0] && /^[a-f0-9]{64}$/i.test(row[0])) members.push({ hash: row[0].toLowerCase(), name });
      else if (row[0]) members.push({ hash: await sha256Hex(normalise(row[0])), name });
    }
  }
  return members;
}

export async function verifyMember(code, env) {
  const normalised = normalise(code);
  if (!/^RGA-[A-Z0-9]{4}-[A-Z0-9]+$/.test(normalised)) return { ok: false };
  const hash = await sha256Hex(normalised);
  if (env.MEMBERS) {
    const name = await env.MEMBERS.get(hash);
    if (name) return { ok: true, name };
  }
  const list = await loadMembers(env);
  const found = list.find((member) => member.hash === hash);
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
      result = await verifyMember(payload.code, env);
    } catch (e) {
      return json({ ok: false, error: "Member list unavailable" }, 503, origin);
    }
    if (!result.ok) return json({ ok: false }, 401, origin);
    return json({ ok: true, name: result.name }, 200, origin);
  },
};
