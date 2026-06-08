import tools from '../../data/tools.json';
import stacks from '../../data/stacks.json';
import { getAllIssues } from '../lib/issues.js';

const BASE = 'https://aitoolsweekly.netlify.app';

export async function GET() {
  const issues = await getAllIssues();

  const staticRoutes = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/tools', priority: '0.9', changefreq: 'weekly' },
    { url: '/stacks', priority: '0.8', changefreq: 'monthly' },
    { url: '/recommend', priority: '0.8', changefreq: 'monthly' },
    { url: '/archive', priority: '0.7', changefreq: 'weekly' },
    { url: '/about', priority: '0.5', changefreq: 'monthly' },
  ];

  const toolRoutes = tools.map(t => ({
    url: `/tools/${t.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
    lastmod: t.addedDate,
  }));

  const stackRoutes = stacks.map(s => ({
    url: `/stacks/${s.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
  }));

  const issueRoutes = issues.map(i => ({
    url: `/archive/${i.date}`,
    priority: '0.6',
    changefreq: 'never',
    lastmod: i.date,
  }));

  const allRoutes = [...staticRoutes, ...toolRoutes, ...stackRoutes, ...issueRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(r => `  <url>
    <loc>${BASE}${r.url}</loc>
    ${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
