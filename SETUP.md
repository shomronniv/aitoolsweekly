# AI Tools Weekly — Automation Setup

## What runs automatically every Monday at 8am UTC

1. Claude generates the newsletter from RSS + your tools list
2. Emails sent to all Netlify Form subscribers via Resend
3. Posts to Reddit (r/SideProject, r/entrepreneur)
4. Saves Twitter + LinkedIn drafts to `/social-drafts/`
5. Commits the new issue to the repo
6. Triggers Netlify to rebuild the site

---

## One-time setup: GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

### Required (email won't send without these)

| Secret | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `RESEND_API_KEY` | resend.com → API Keys (free account) |
| `NETLIFY_ACCESS_TOKEN` | app.netlify.com → User settings → Applications → Personal access tokens |
| `NETLIFY_FORM_ID` | See step below |
| `NETLIFY_BUILD_HOOK` | See step below |

### Optional (Reddit posting — skip if you don't want this)

| Secret | Where to get it |
|---|---|
| `REDDIT_CLIENT_ID` | reddit.com/prefs/apps → Create app (script type) |
| `REDDIT_CLIENT_SECRET` | Same app page |
| `REDDIT_USERNAME` | Your Reddit account username |
| `REDDIT_PASSWORD` | Your Reddit account password |

---

## Finding your Netlify Form ID

1. Go to app.netlify.com → your site → **Forms**
2. Click the "subscribe" form
3. The URL will contain the form ID: `app.netlify.com/sites/.../forms/FORM_ID_HERE`
4. Add that ID as `NETLIFY_FORM_ID`

## Creating a Netlify Build Hook

1. Go to app.netlify.com → your site → **Site configuration → Build hooks**
2. Click **Add build hook** → name it "Weekly rebuild" → Save
3. Copy the URL and add it as `NETLIFY_BUILD_HOOK`

## Setting up Resend

1. Create a free account at resend.com
2. Go to **Domains** → Add your domain (aitoolsweekly.com) and verify DNS
3. OR use `onboarding@resend.dev` as the from address while testing (no domain needed)
4. Go to **API Keys** → Create key → add as `RESEND_API_KEY`

> Note: Until your domain is verified, update the `from` field in `scripts/send-newsletter.js`
> from `digest@aitoolsweekly.com` to `onboarding@resend.dev`

## Reddit app setup

1. Go to reddit.com/prefs/apps (logged in as the account you want to post from)
2. Click **Create app**
3. Name: `AIToolsWeeklyBot`
4. Type: **script**
5. Redirect URI: `http://localhost`
6. Save → copy Client ID (under app name) and Client Secret

---

## Social drafts

Every Monday, Twitter and LinkedIn post drafts are saved to `/social-drafts/YYYY-MM-DD-twitter.txt`
and `/social-drafts/YYYY-MM-DD-linkedin.txt`. Copy-paste them to post manually,
or connect Buffer/Hootsuite to automate further.

---

## Manual trigger

You can run the whole pipeline anytime without waiting for Monday:
GitHub repo → **Actions → Weekly AI Tools Digest → Run workflow**
