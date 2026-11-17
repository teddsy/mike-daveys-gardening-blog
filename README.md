# Mike Davey’s Gardening Blog

A demo static website for Mike Davey: a personal gardening blog, a growing knowledge hub, and the Seed Ordering Service you can click through in the browser.

The Seed Ordering Service is a demonstration. It does not take payment, and it does not send orders anywhere. The basket is stored in this browser only.

The Seed Ordering Service pages ask for a member code. On GitHub Pages that check runs in the browser against hashes, which is not real protection. `cloudflare/README.md` explains how Mike can run the same check in a Cloudflare Worker and host the site on Cloudflare Pages.

Published with GitHub Pages:

https://teddsy.github.io/mike-daveys-gardening-blog/

## What is on the site

- **Home** is the blog: a short welcome and three sample posts.
- **Growing Knowledge Hub** links to the crop guide, monthly jobs and growing tips. East Midlands and Nottinghamshire notes stay, because they are about the soil and the season.
- **Seed Ordering Service** is the Kings Seeds catalogue, the basket, the quick list and a printable summary.
- **About Mike** is a placeholder, marked so Mike can replace it with his own words.

## Publish

Merging to `main` runs `.github/workflows/pages.yml`. That workflow uploads this folder and deploys it with GitHub Pages (`actions/upload-pages-artifact` and `actions/deploy-pages`).

In the repository, open **Settings**, then **Pages**, and set the source to **GitHub Actions**.

Links are relative, so the site works in the project path `/mike-daveys-gardening-blog/` and also if these files are later served from the root of a domain. An empty `.nojekyll` file is included so Pages does not hide files that start with an underscore.

## Moving it later

Mike can point his own domain at this site. On GitHub, open **Settings**, then **Pages**, then **Custom domain**, and add the domain. Put that same domain in a `CNAME` file at the top of this repository. At the domain host, add the DNS records GitHub shows on that settings page. The relative links keep working.

To host the same files somewhere else, copy everything except `.git` onto any static host. `index.html` should stay at the top of the published folder.

To make this a real blog, replace the sample posts in `index.html` and the placeholder on `about.html`. The pages are ordinary HTML, so they can stay as they are or be copied into another static host later.
