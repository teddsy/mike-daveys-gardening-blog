/* Member gate for the Seed Ordering Service.
   verifyMember is the only check. On GitHub Pages it compares a SHA-256 hash
   in the browser. That is a demo, not real security: the shop files are still
   downloaded. A Cloudflare Worker can answer the same function. See cloudflare/README.md. */
(function (root) {
  'use strict';
  var STORAGE_KEY = 'seedMemberSession';
  var TAG_KEY = 'seedOrderTag';

  function season() {
    return (root.MEMBERS && root.MEMBERS.season) || '';
  }

  function normalise(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      var hex = '';
      var bytes = new Uint8Array(buf);
      for (var i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
      return hex;
    });
  }

  function verifyLocal(normalised) {
    var list = (root.MEMBERS && root.MEMBERS.members) || [];
    return sha256Hex(normalised).then(function (hash) {
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].hash === hash) {
          return { ok: true, name: list[i].name, code: normalised, season: season() };
        }
      }
      return { ok: false };
    });
  }

  function verifyMember(code) {
    var normalised = normalise(code);
    if (!/^RGA-[A-Z0-9]{4}-[A-Z0-9]+$/.test(normalised)) return Promise.resolve({ ok: false });
    var remote = root.MEMBERS && root.MEMBERS.verifyUrl;
    if (remote) {
      return fetch(remote, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: normalised })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (res.ok && data && data.ok && data.name) {
            return { ok: true, name: String(data.name), code: normalised, season: season() };
          }
          return { ok: false };
        });
      }).catch(function () { return { ok: false }; });
    }
    return verifyLocal(normalised);
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.season !== season() || !data.code || !data.name) return null;
      return { season: data.season, code: String(data.code), name: String(data.name) };
    } catch (e) {
      return null;
    }
  }

  function writeSession(member) {
    var record = { season: season(), code: member.code, name: member.name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    localStorage.setItem(TAG_KEY, JSON.stringify(record));
  }

  function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    try { localStorage.removeItem(TAG_KEY); } catch (e) {}
  }

  function paint() {
    var member = readSession();
    document.body.classList.toggle('is-member', !!member);
    var bar = document.getElementById('member-bar');
    if (bar) {
      bar.hidden = !member;
      bar.textContent = '';
      if (member) {
        bar.appendChild(document.createTextNode('Signed in as ' + member.name + ' - '));
        var link = document.createElement('a');
        link.href = '#sign-out';
        link.id = 'member-signout';
        link.textContent = 'Sign out';
        bar.appendChild(link);
      }
    }
    var who = document.getElementById('order-who');
    if (who) who.textContent = member ? ('Ordering as ' + member.name + ' · ' + member.code) : '';
    var printName = document.getElementById('print-member-name');
    var printCode = document.getElementById('print-member-code');
    if (printName) printName.textContent = member ? member.name : '';
    if (printCode) printCode.textContent = member ? member.code : '';
    var buyer = document.getElementById('buyer-name');
    if (buyer && member && !buyer.value) buyer.value = member.name;
  }

  function init() {
    if (!document.body || !document.body.hasAttribute('data-member-gate')) return;
    paint();
    var form = document.getElementById('member-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('member-code');
        var error = document.getElementById('member-error');
        var button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        verifyMember(input && input.value).then(function (result) {
          if (button) button.disabled = false;
          if (!result.ok) {
            if (error) error.hidden = false;
            return;
          }
          if (error) error.hidden = true;
          writeSession(result);
          if (input) input.value = '';
          paint();
        });
      });
    }
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest && e.target.closest('#member-signout');
      if (!link) return;
      e.preventDefault();
      clearSession();
      paint();
    });
  }

  root.verifyMember = verifyMember;
  root.SEED_MEMBER = {
    verifyMember: verifyMember,
    current: readSession,
    signOut: function () { clearSession(); paint(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
