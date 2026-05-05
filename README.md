# unlogic.games

This is the main page for the Unlogic Games company, showcasing our collection of HTML5 games. The site is built using GitHub Pages and deployed via GitHub Actions workflows.

## Development workflow

### Branches

- `main` — production branch. Every merge triggers a deployment to the live site.
- Feature branches — create a branch per feature/fix, open a PR when ready.

### PR previews

When you open a pull request, the `preview.yml` workflow automatically deploys the branch content to a subdirectory of the Pages site and posts a comment with the URL:

```
https://unlogicgames.github.io/unlogic.games/pr-preview/pr-<number>/
```

The preview updates on every new push to the PR branch and is automatically removed when the PR is merged or closed.

### Deploying to production

Merge the PR into `main`. The `deploy.yml` workflow runs automatically and publishes the contents of `public/` to the live site. Active PR previews are preserved during production deploys.

### Custom domain

If a custom domain is configured, both production and previews are served under it:

- Production: `https://mydomain.com/`
- PR preview: `https://mydomain.com/pr-preview/pr-<number>/`

The `public/CNAME` file must contain the custom domain so it is included in every deployment and not lost on redeploy.

## GitHub Pages setup

The repository uses the **"Deploy from branch"** Pages source (branch: `gh-pages`, folder: `/`). This allows production and PR preview deployments to coexist as subdirectories of the same branch.

> If you need to reconfigure Pages from scratch: merge the updated `deploy.yml` first (this creates the `gh-pages` branch), then go to **Settings > Pages** and switch the source to **"Deploy from branch → gh-pages / (root)"**.

## Project structure

```
public/
├── index.html
├── CNAME           # custom domain (if applicable)
├── assets/
│   └── horizontal.png
├── css/
│   ├── base.css
│   └── ui.css
└── js/
    ├── config.js
    ├── state.js
    ├── audio.js
    ├── highscores.js
    ├── layout.js
    ├── particles.js
    ├── render.js
    ├── gameover.js
    ├── transitions.js
    ├── input.js
    ├── main.js
    └── games/
        ├── pong.js
        ├── arkanoid.js
        ├── invaders.js
        └── snake.js
```

JS files are loaded in dependency order — each file relies on globals defined by the previous ones.
