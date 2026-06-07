/**
 * post-social.js
 * Runs after newsletter is generated. Does two things:
 * 1. Posts a weekly digest summary to Reddit (r/entrepreneur, r/SideProject)
 * 2. Saves ready-to-post content for Twitter/LinkedIn to social-drafts/
 *
 * Required GitHub secrets:
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 *
 * Optional (skip Reddit if not set, still generates drafts):
 *   All REDDIT_* vars are optional — drafts are always generated.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Reddit OAuth ───────────────────────────────────────────────────────────
async function getRedditToken() {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD } = process.env;
  if (!REDDIT_CLIENT_ID) return null;

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AIToolsWeeklyBot/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: REDDIT_USERNAME,
      password: REDDIT_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function postToReddit(token, { subreddit, title, text }) {
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AIToolsWeeklyBot/1.0',
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text,
      nsfw: 'false',
      spoiler: 'false',
    }),
  });

  const data = await res.json();
  if (data.json?.errors?.length) throw new Error(data.json.errors[0][1]);
  const url = data.json?.data?.url;
  console.log(`✅ Posted to r/${subreddit}: ${url}`);
  return url;
}

// ── Build Reddit post from newsletter ─────────────────────────────────────
function buildRedditPost(issue) {
  const siteUrl = 'https://aitoolsweekly.netlify.app';

  // Extract first 2 paragraphs of newsletter body as teaser
  const lines = issue.body
    .replace(/SUBJECT:.*\n?/, '')
    .trim()
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('-'))
    .slice(0, 3)
    .join('\n\n');

  return {
    title: issue.subject,
    text: `${lines}

---

📬 Full issue + all tools: ${siteUrl}

*I run AI Tools Weekly — a free Monday newsletter tracking the best new AI tools for small business owners. No hype, just tools that actually save time and money.*

*Would love feedback from this community — what AI tools are you using in your business right now?*`,
  };
}

// ── Build Twitter thread ───────────────────────────────────────────────────
function buildTwitterThread(issue) {
  const siteUrl = 'https://aitoolsweekly.netlify.app';

  const lines = issue.body
    .replace(/SUBJECT:.*\n?/, '')
    .trim()
    .split('\n')
    .filter(l => l.trim())
    .slice(0, 8);

  return `🧵 AI Tools Weekly — ${issue.date}

${issue.subject}

${lines.slice(0, 3).join('\n')}

↓ Thread continues

${lines.slice(3, 6).join('\n')}

---

🔗 Full issue + all tools: ${siteUrl}
📬 Subscribe free (every Monday): ${siteUrl}/#subscribe

#AITools #SmallBusiness #Productivity #AIWeekly`;
}

// ── Build LinkedIn post ────────────────────────────────────────────────────
function buildLinkedInPost(issue) {
  const siteUrl = 'https://aitoolsweekly.netlify.app';

  const preview = issue.body
    .replace(/SUBJECT:.*\n?/, '')
    .trim()
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .slice(0, 5)
    .join('\n');

  return `📬 AI Tools Weekly — ${issue.date}

${issue.subject}

${preview}

Every Monday I send a free digest of the best new AI tools for small business owners — practical picks that save real time.

👉 Subscribe free: ${siteUrl}

#AITools #SmallBusiness #Entrepreneurship #Productivity #ArtificialIntelligence`;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function run() {
  const outputPath = join(__dirname, '..', '.newsletter-output.json');
  const issue = JSON.parse(await readFile(outputPath, 'utf-8'));

  console.log(`Generating social content for: ${issue.subject}`);

  // Save social drafts
  const draftsDir = join(__dirname, '..', 'social-drafts');
  await mkdir(draftsDir, { recursive: true });

  const twitter = buildTwitterThread(issue);
  const linkedin = buildLinkedInPost(issue);

  await writeFile(join(draftsDir, `${issue.date}-twitter.txt`), twitter);
  await writeFile(join(draftsDir, `${issue.date}-linkedin.txt`), linkedin);
  console.log(`✅ Saved Twitter + LinkedIn drafts to social-drafts/${issue.date}-*.txt`);

  // Reddit posting (only if credentials are set)
  const token = await getRedditToken().catch(() => null);

  if (!token) {
    console.log('ℹ️  No Reddit credentials — skipping Reddit posting.');
    console.log('   Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD to enable.');
    return;
  }

  const { title, text } = buildRedditPost(issue);

  // Post to subreddits with a delay between each to avoid spam filters
  const subreddits = [
    { name: 'SideProject', delay: 0 },
    { name: 'entrepreneur', delay: 10 * 60 * 1000 }, // 10 min gap
  ];

  for (const { name, delay } of subreddits) {
    if (delay) {
      console.log(`Waiting ${delay / 60000} minutes before posting to r/${name}...`);
      await new Promise(r => setTimeout(r, delay));
    }
    try {
      await postToReddit(token, { subreddit: name, title, text });
    } catch (e) {
      console.warn(`Failed to post to r/${name}:`, e.message);
    }
  }

  console.log('✅ Social posting complete.');
}

run().catch(err => { console.error('Social posting failed:', err); process.exit(1); });
