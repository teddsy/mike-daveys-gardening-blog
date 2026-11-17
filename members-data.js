/* Demo sign-in for the Seed Ordering Service.
   login.hash is the SHA-256 of the username, a newline, then the password.
   The username is compared in lower case. The password is compared as typed.
   discountPercent is the example member discount. Change this one number to
   change every member price. The browser check is not real protection.
   See cloudflare/README.md. */
window.MEMBERS = {
  season: "2026-27",
  verifyUrl: "",
  discountPercent: 50,
  login: {
    hash: "be772fe4c265879c27e60946ee1a4e67f0380bad51247fe2c6ca7a3d1e1cae51",
    name: "Mike"
  }
};
