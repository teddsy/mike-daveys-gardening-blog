# Member check for the Seed Ordering Service

The GitHub Pages site asks for a member code in the browser. `verifyMember` in `member-gate.js` hashes the code and compares it with `members-data.js`. That is a **demo**. It is not real security. Anyone can read the page source, skip the panel, or copy the shop files. The hashes are public.

This folder is a Cloudflare Worker that runs the same check on the server. The member list stays in KV or in a sheet the worker fetches. Visitors only receive yes or no, plus the name when the code matches.

## What Mike changes for real protection

1. Put the static site on Cloudflare Pages (steps below), not only on GitHub Pages.
2. Deploy this worker and point `verifyUrl` in `members-data.js` at it.
3. Stop publishing the hash list in `members-data.js` once the worker is the only check. Leave `members: []` and set `verifyUrl`.
4. Keep orders behind the worker as well, if an order is ever sent to a server. A hidden panel does not protect a file that Pages already served.

## Deploy the worker

From this folder:

```bash
npx wrangler login
npx wrangler deploy
```

The check is `POST /verify` with JSON `{ "code": "RGA-0000-NAME" }`. A match returns `{ "ok": true, "name": "..." }`. Anything else returns `{ "ok": false }` and does not reveal which part failed.

Set the site origin so browsers on the real domain can call the worker:

```bash
npx wrangler secret put ALLOW_ORIGIN
```

Use the site origin, such as `https://example.com`. Until that is set, the worker allows any origin so the first test is easy. Tighten it before real use.

Then in `members-data.js` set:

```js
verifyUrl: "https://seed-ordering-members.<account>.workers.dev/verify"
```

`verifyMember` on the site will send the code to the worker instead of using the local hash list.

## Members in KV

Keys are the SHA-256 hex of the code in uppercase with spaces removed. The value is the name people see.

```bash
npx wrangler kv namespace create MEMBERS
```

Put the namespace id in `wrangler.toml`, then:

```bash
printf '%s' 'RGA-0000-NAME' | sha256sum
npx wrangler kv key put --binding MEMBERS <hash> "First name"
```

Use a real code in place of the example. Do not commit that code.

## Members in a Google Sheet

Make a sheet with columns `hash` and `name`. Publish it to the web as a CSV (File → Share → Publish to web). Put the CSV address in `wrangler.toml`:

```toml
[vars]
MEMBERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
```

A published sheet is world-readable. Store hashes in it, not plain codes. A column named `code` also works: the worker hashes it before comparing, but anyone who can open the sheet can read those codes. Prefer `hash`.

KV is checked first. The CSV is used as well, so either source can accept a code.

## Move the site to Cloudflare Pages

1. In Cloudflare, create a Pages project and connect the GitHub repository `teddsy/mike-daveys-gardening-blog`.
2. Build command: none. Output directory: the repository root, or a build that copies the site without this `cloudflare` folder.
3. Deploy. Pages gives an address ending in `.pages.dev`.
4. Add Mike’s own domain in the Pages project, and set the DNS records Cloudflare shows.
5. Deploy this worker and set `verifyUrl` as above.
6. Remove the demo hashes from `members-data.js` after a successful sign-in against the worker.

GitHub Pages can stay as a public blog preview. The Seed Ordering Service should only be treated as private once the worker, not the browser, decides who gets in.
