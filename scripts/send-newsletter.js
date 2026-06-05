import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resend = new Resend(process.env.RESEND_API_KEY);

// Subscriber list — in production, fetch from a DB or Resend audience
// For MVP: store emails in a flat file data/subscribers.json
// Netlify Forms submissions can be exported and added here weekly

async function getSubscribers() {
  try {
    const data = await readFile(join(__dirname, '..', 'data', 'subscribers.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return ['test@example.com']; // fallback for first run
  }
}

function markdownToHtml(text) {
  return text
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#0066cc">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 style="margin:1.5rem 0 0.5rem;font-size:1.1rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:2rem 0 0.75rem;font-size:1.3rem">$1</h2>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:0.4rem">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, match => `<ul style="padding-left:1.5rem;margin:0.75rem 0">${match}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin-bottom:1rem">')
    .replace(/^(.)/m, '<p style="margin-bottom:1rem">$1')
    + '</p>';
}

async function run() {
  const outputPath = join(__dirname, '..', '.newsletter-output.json');
  const { subject, body, date } = JSON.parse(await readFile(outputPath, 'utf-8'));

  const subscribers = await getSubscribers();
  const htmlBody = markdownToHtml(body);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a">
  <div style="border-bottom:2px solid #1a1a1a;padding-bottom:1rem;margin-bottom:2rem">
    <strong style="font-size:1.1rem">AI Tools Weekly</strong>
    <span style="color:#888;font-size:0.85rem;margin-left:1rem">${date}</span>
  </div>
  ${htmlBody}
  <div style="border-top:1px solid #eee;margin-top:2rem;padding-top:1rem;font-size:0.8rem;color:#888;text-align:center">
    <p>AI Tools Weekly · <a href="https://aitoolsweekly.com" style="color:#555">aitoolsweekly.com</a></p>
    <p>You're receiving this because you subscribed. <a href="{{{ unsubscribe_url }}}" style="color:#555">Unsubscribe</a></p>
  </div>
</body>
</html>`;

  console.log(`Sending to ${subscribers.length} subscribers...`);

  // Send in batches of 50
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50);
    await Promise.all(batch.map(email =>
      resend.emails.send({
        from: 'AI Tools Weekly <digest@aitoolsweekly.com>',
        to: email,
        subject,
        html,
      })
    ));
    if (i + 50 < subscribers.length) {
      await new Promise(r => setTimeout(r, 1000)); // rate limit pause
    }
  }

  console.log('Newsletter sent successfully.');
}

run().catch(console.error);
