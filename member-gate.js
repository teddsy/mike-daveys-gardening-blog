/* Member gate for the Seed Ordering Service.
   verifyMember is the only check. On GitHub Pages it compares a SHA-256 hash
   in the browser. That is a demo, not real security: the catalogue files are still
   downloaded. A Cloudflare Worker can answer the same function. See cloudflare/README.md. */
(function (root) {
  'use strict';
  var STORAGE_KEY = 'seedMemberSession';
  var TAG_KEY = 'seedOrderTag';

  function season() {
    return (root.MEMBERS && root.MEMBERS.season) || '';
  }

  function normaliseUser(username) {
    return String(username || '').trim().toLowerCase();
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

  function verifyLocal(username, password) {
    var login = root.MEMBERS && root.MEMBERS.login;
    return sha256Hex(username + '\n' + password).then(function (hash) {
      if (!login || hash !== login.hash) return { ok: false };
      return { ok: true, name: login.name, username: username, season: season() };
    });
  }

  function verifyMember(username, password) {
    var user = normaliseUser(username);
    var pass = String(password || '');
    if (!user || !pass) return Promise.resolve({ ok: false });
    var remote = root.MEMBERS && root.MEMBERS.verifyUrl;
    if (remote) {
      return fetch(remote, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (res.ok && data && data.ok && data.name) {
            return { ok: true, name: String(data.name), username: user, season: season() };
          }
          return { ok: false };
        });
      }).catch(function () { return { ok: false }; });
    }
    return verifyLocal(user, pass);
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.season !== season() || !data.username || !data.name) return null;
      return { season: data.season, username: String(data.username), name: String(data.name) };
    } catch (e) {
      return null;
    }
  }

  function writeSession(member) {
    var record = { season: season(), username: member.username, name: member.name };
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
    if (who) who.textContent = member ? ('Ordering as ' + member.name + ' · ' + member.username) : '';
    var printName = document.getElementById('print-member-name');
    var printCode = document.getElementById('print-member-code');
    if (printName) printName.textContent = member ? member.name : '';
    if (printCode) printCode.textContent = member ? member.username : '';
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
        var user = document.getElementById('member-user');
        var pass = document.getElementById('member-pass');
        var error = document.getElementById('member-error');
        var button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        verifyMember(user && user.value, pass && pass.value).then(function (result) {
          if (button) button.disabled = false;
          if (!result.ok) {
            if (error) error.hidden = false;
            return;
          }
          if (error) error.hidden = true;
          writeSession(result);
          if (pass) pass.value = '';
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
