# beck-apps

Monorepo for personal apps, games, and experiments. Each app lives in `apps/` and gets its own Vercel project.

## Structure

```
apps/
  hub/              ← main site linking to all apps
  placeholder-app/  ← starter app (replace with your first real project)
```

## Setup (do this once)

### 1. Create the GitHub repo

```bash
cd beck-apps
git init
git add .
git commit -m "initial monorepo setup"
```

Then create a repo on GitHub (e.g. `beck-apps`) and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/beck-apps.git
git branch -M main
git push -u origin main
```

### 2. Deploy the hub site to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `beck-apps` repo
3. **Root Directory** → change to `apps/hub`
4. Framework Preset → `Other` (it's plain HTML)
5. Click Deploy

Your hub site is now live at `something.vercel.app`.

### 3. Deploy the placeholder app (same repo, new Vercel project)

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import the **same** `beck-apps` repo
3. **Root Directory** → change to `apps/placeholder-app`
4. Framework Preset → `Other`
5. Click Deploy

Now you have two Vercel projects from one repo. Each auto-deploys when you push changes to its `apps/` subdirectory.

### 4. Update the hub

Edit `apps/hub/index.html` to update the placeholder link with your real Vercel URLs. Add new cards as you add new apps.

## Adding a new app

1. Create a new folder: `apps/my-new-app/`
2. Add at minimum an `index.html` (or set up whatever framework you want)
3. Push to GitHub
4. Go to [vercel.com/new](https://vercel.com/new), import `beck-apps`, set Root Directory to `apps/my-new-app/`
5. Add a card for it in `apps/hub/index.html`

That's it. Each app is independent — you can use different frameworks, different build configs, whatever you want.
