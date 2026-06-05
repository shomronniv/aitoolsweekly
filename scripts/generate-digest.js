import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchAIToolsNews() {
  // Fetch from multiple free RSS sources
  const sources = [
    'https://theresanaiforthat.com/rss/',
    'https://www.producthunt.com/feed?category=artificial-intelligence',
  ];

  const items = [];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      const xml = await res.text();
      // Simple XML parsing — extract <title> and <description> tags
      const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]);
      const descs = [...xml.matchAll(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g)].map(m => m[1]);
      titles.slice(1, 8).forEach((title, i) => {
        items.push({ title, description: descs[i + 1] || '' });
      });
    } catch (e) {
      console.warn(`Failed to fetch ${url}:`, e.message);
    }
  }

  return items.slice(0, 15);
}

async function generateNewsletter(newsItems, tools) {
  const toolsSample = tools.slice(0, 5).map(t =>
    `- ${t.name}: ${t.tagline} (${t.pricing}) → ${t.affiliateUrl}`
  ).join('\n');

  const newsContext = newsItems.map(i => `- ${i.title}: ${i.description}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You write a weekly email newsletter called "AI Tools Weekly" for small business owners.

This week's AI news and new tools:
${newsContext}

Tools to feature (use their real affiliate links exactly as given):
${toolsSample}

Write this week's newsletter. Format:
1. Subject line (punchy, specific, under 50 chars) — prefix with SUBJECT:
2. A 2-sentence intro that is friendly and relevant to this week's news
3. "This Week's Top Picks" — 3 tool recommendations, each with: tool name, one sentence on what it does, who it's best for, price, and the affiliate link as a CTA button label like [Try [Name] Free →](url)
4. One "Quick Tip" (2–3 sentences of practical AI advice for small business owners)
5. A 1-sentence sign-off

Keep it under 350 words. No hype, no fluff. Tone: smart friend who saves you time.`
    }]
  });

  return message.content[0].text;
}

async function run() {
  console.log('Fetching AI news...');
  const newsItems = await fetchAIToolsNews();

  const toolsPath = join(__dirname, '..', 'data', 'tools.json');
  const tools = JSON.parse(await readFile(toolsPath, 'utf-8'));

  console.log('Generating newsletter with Claude...');
  const newsletter = await generateNewsletter(newsItems, tools);

  // Parse subject line
  const subjectMatch = newsletter.match(/SUBJECT:\s*(.+)/);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'This week in AI tools';
  const body = newsletter.replace(/SUBJECT:.*\n/, '').trim();

  const today = new Date().toISOString().split('T')[0];
  const issue = {
    date: today,
    subject,
    preview: body.substring(0, 120) + '...',
    body,
    toolsSlugs: tools.slice(0, 3).map(t => t.slug)
  };

  // Save issue to data/issues/
  const issuesDir = join(__dirname, '..', 'data', 'issues');
  await mkdir(issuesDir, { recursive: true });
  await writeFile(join(issuesDir, `${today}.json`), JSON.stringify(issue, null, 2));
  console.log(`Issue saved: data/issues/${today}.json`);

  // Save newsletter body for email sending
  await writeFile(join(__dirname, '..', '.newsletter-output.json'), JSON.stringify({ subject, body, date: today }));
  console.log('Done. Newsletter output saved.');
}

run().catch(console.error);
