import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function getLatestIssue() {
  try {
    const dir = join(process.cwd(), 'data', 'issues');
    const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort().reverse();
    if (!files.length) return null;
    const content = await readFile(join(dir, files[0]), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getAllIssues() {
  try {
    const dir = join(process.cwd(), 'data', 'issues');
    const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort().reverse();
    const issues = await Promise.all(
      files.map(async f => {
        const content = await readFile(join(dir, f), 'utf-8');
        return JSON.parse(content);
      })
    );
    return issues;
  } catch {
    return [];
  }
}
