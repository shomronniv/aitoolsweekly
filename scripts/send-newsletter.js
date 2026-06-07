import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Fetch live subscribers from Netlify Forms ──────────────────────────────
async function getSubscribers() {
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID || '5c543362-e1aa-4cae-9f0d-0743cbfa21ae';

  if (token) {
    try {
      console.log('Fetching subscribers from Netlify Forms...');
      // Find the subscribe form by name
      const formsRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!formsRes.ok) throw new Error(`Netlify API error: ${formsRes.status}`);
      const forms = await formsRes.json();
      const subscribeForm = forms.find(f => f.name === 'subscribe');
      if (!subscribeForm) {
        console.log('No subscribe form found yet (no submissions received). Using fallback.');
      } else {
        let emails = [];
        let page = 1;
        while (true) {
          const res = await fetch(
            `https://api.netlify.com/api/v1/forms/${subscribeForm.id}/submissions?per_page=100&page=${page}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error(`Netlify submissions error: ${res.status}`);
          const submissions = await res.json();
          if (!submissions.length) break;
          submissions.forEach(s => {
            const email = s.data?.email || s.email;
            if (email && !emails.includes(email)) emails.push(email);
          });
          if (submissions.length < 100) break;
          page++;
        }
        console.log(`Found ${emails.length} subscribers from Netlify Forms.`);
        return emails;
      }
    } catch (e) {
      console.warn('Netlify Forms fetch failed, falling back to subscribers.json:', e.message);
    }
  }

  // Fallback: static file
  try {
    const data = await readFile(join(__dirname, '..', 'data', 'subscribers.json'), 'utf-8');
    const list = JSON.parse(data);
    console.log(`Loaded ${list.length} subscribers from subscribers.json.`);
    return list;
  } catch {
    console.warn('No subscribers found. Using test email.');
    return ['test@example.com'];
  }
}

// ── Convert markdown to email-safe HTML ───────────────────────────────────
function markdownToHtml(text) {
  return text
    .replace(/SUBJECT:.*\n?/, '')
    .trim()
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) =>
      url.startsWith('http')
        ? `<a href="${url}" style="color:#6366f1;font-weight:600;">${label}</a>`
        : label
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 style="margin:1.5rem 0 0.5rem;font-size:1rem;font-weight:700;color:#1e1b4b;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:2rem 0 0.75rem;font-size:1.15rem;font-weight:800;color:#1e1b4b;border-bottom:2px solid #e0e7ff;padding-bottom:0.4rem;">$1</h2>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:0.5rem;padding-left:0.25rem;">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, m => `<ul style="padding-left:1.25rem;margin:0.75rem 0;">${m}</ul>`)
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.startsWith('<') ? p : `<p style="margin:0 0 1rem;line-height:1.7;color:#374151;">${p}</p>`)
    .join('\n');
}

// ── Build premium HTML email ───────────────────────────────────────────────
function buildEmailHtml({ subject, body, date }) {
  const content = markdownToHtml(body);
  const siteUrl = 'https://aitoolsweekly.netlify.app';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f0f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%);padding:36px 40px;text-align:center;">
            <div style="margin-bottom:16px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#818cf8;margin-right:8px;vertical-align:middle;"></span>
              <span style="color:#fff;font-weight:800;font-size:20px;letter-spacing:-0.02em;vertical-align:middle;">AI Tools Weekly</span>
            </div>
            <div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:4px 14px;">
              <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">${date}</span>
            </div>
          </td>
        </tr>

        <!-- Subject preview -->
        <tr>
          <td style="background:#eef2ff;padding:20px 40px;border-bottom:1px solid #e0e7ff;">
            <p style="margin:0;font-size:18px;font-weight:800;color:#1e1b4b;letter-spacing:-0.01em;">${subject}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:#374151;font-size:15px;line-height:1.7;">
            ${content}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;text-align:center;">
            <a href="${siteUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 12px rgba(99,102,241,0.35);">Browse all tools →</a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="height:1px;background:#e0e7ff;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9ff;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">
              <a href="${siteUrl}" style="color:#6366f1;text-decoration:none;font-weight:600;">AI Tools Weekly</a>
              &nbsp;·&nbsp; The best AI tools for small business owners, every Monday.
            </p>
            <p style="margin:0;color:#9ca3af;font-size:11px;">
              You're receiving this because you subscribed at ${siteUrl}.
              &nbsp;<a href="${siteUrl}" style="color:#9ca3af;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function run() {
  const outputPath = join(__dirname, '..', '.newsletter-output.json');
  const issue = JSON.parse(await readFile(outputPath, 'utf-8'));

  const subscribers = await getSubscribers();
  if (!subscribers.length) { console.log('No subscribers. Exiting.'); return; }

  const html = buildEmailHtml(issue);

  console.log(`Sending "${issue.subject}" to ${subscribers.length} subscribers...`);

  // Send in batches of 50 with rate-limit pause
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50);
    await Promise.all(batch.map(email =>
      resend.emails.send({
        from: 'AI Tools Weekly <digest@aitoolsweekly.com>',
        to: email,
        subject: issue.subject,
        html,
      }).catch(err => console.warn(`Failed to send to ${email}:`, err.message))
    ));
    console.log(`Sent batch ${Math.floor(i / 50) + 1} (${Math.min(i + 50, subscribers.length)}/${subscribers.length})`);
    if (i + 50 < subscribers.length) await new Promise(r => setTimeout(r, 1000));
  }

  console.log('✅ Newsletter sent successfully.');
}

run().catch(err => { console.error('Send failed:', err); process.exit(1); });
