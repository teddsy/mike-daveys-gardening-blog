# Sign-in for the Seed Ordering Service

The GitHub Pages site asks for a username and password. `verifyMember` in `member-gate.js` hashes `username`, a newline, then the password, and compares that with `members-data.js`. The username is lower case. The password is as typed.

That is a **demo**. It is not real security. Anyone can read the page source, skip the panel, or copy the catalogue. The demo login is printed on the sign-in panel:

Demo login - Username: mike123  Password: mike123

This folder is a Cloudflare Worker that runs the same check on the server. Visitors only receive yes or no, plus the name when the login matches.

## What Mike changes for real protection

1. Put the static site on Cloudflare Pages (steps below), not only on GitHub Pages.
2. Deploy this worker and point `verifyUrl` in `members-data.js` at it.
3. Remove `login.hash` from the public `members-data.js` once the worker is the only check.
4. Keep any future order endpoint behind the worker as well. A hidden panel does not protect a file that Pages already served.

## Deploy the worker

From this folder:

```bash
npx wrangler login
npx wrangler deploy
```

The check is `POST /verify` with JSON `{ "username": "mike123", "password": "mike123" }`. A match returns `{ "ok": true, "name": "Mike" }`. Anything else returns `{ "ok": false }`.

Set the site origin so browsers on the real domain can call the worker:

```bash
npx wrangler secret put ALLOW_ORIGIN
```

Use the site origin, such as `https://example.com`. Until that is set, the worker allows any origin so the first test is easy. Tighten it before real use.

Then in `members-data.js` set:

```js
verifyUrl: "https://seed-ordering-members.<account>.workers.dev/verify"
```

`verifyMember` on the site will send the username and password to the worker instead of using the local hash.

## Logins in KV

Keys are the SHA-256 hex of `username`, a newline, then the password. The value is the name people see.

```bash
npx wrangler kv namespace create MEMBERS
printf '%s\n%s' 'mike123' 'mike123' | sha256sum
npx wrangler kv key put --binding MEMBERS <hash> "Mike"
```

Put the namespace id in `wrangler.toml`. Do not commit real passwords. The demo pair above is already shown on the public sign-in panel.

## Logins in a Google Sheet

Make a sheet with columns `hash` and `name`, or `username`, `password` and `name`. Publish it to the web as a CSV and put the address in `wrangler.toml`:

```toml
[vars]
MEMBERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
```

A published sheet is world-readable. Keep hashes in it, not passwords. A `password` column also works: the worker hashes it before comparing, but anyone who can open the sheet can read those passwords. Prefer `hash`.

KV is checked first. The CSV is used as well, so either source can accept a login.

## Move the site to Cloudflare Pages

1. In Cloudflare, create a Pages project and connect the GitHub repository `teddsy/mike-daveys-gardening-blog`.
2. Build command: none. Output directory: the repository root, or a copy of the site without this `cloudflare` folder.
3. Deploy. Pages gives an address ending in `.pages.dev`.
4. Add Mike’s own domain in the Pages project, and set the DNS records Cloudflare shows.
5. Deploy this worker and set `verifyUrl` as above.
6. Remove the demo hash from `members-data.js` after a successful sign-in against the worker.

GitHub Pages can stay as a public blog preview. The Seed Ordering Service should only be treated as private once the worker, not the browser, decides who gets in.
