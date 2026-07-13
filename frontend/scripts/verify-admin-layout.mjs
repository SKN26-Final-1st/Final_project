import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const adminPage = readFileSync(resolve(rootDir, 'src/pages/AdminPage.tsx'), 'utf8');
const styleIndex = readFileSync(resolve(rootDir, 'src/styles/index.css'), 'utf8');
const styles = [...styleIndex.matchAll(/@import ['"]\.\/(.+?)['"];?/g)]
  .map((match) => readFileSync(resolve(rootDir, 'src/styles', match[1]), 'utf8'))
  .join('\n');

const failures = [];

if (/<Row\b[^>]*className=["'{][^"'}]*admin-workspace-grid/.test(adminPage)) {
  failures.push('admin-workspace-grid must not be applied to Ant Design Row.');
}

if (/<Col\b[^>]*>\s*<SectionCard title="포인트 \/ 구독">[\s\S]*?<SectionCard title="backend 미지원 기능">[\s\S]*?<\/Col>/.test(adminPage)) {
  failures.push('Stacked admin cards must not be direct Ant Col children inside the workspace grid.');
}

if (
  /@media\s*\(min-width:\s*1200px\)\s*{[\s\S]*?\.startup-admin-page\s+\.section-card\s*{[\s\S]*?height:\s*100%/m.test(
    styles,
  )
) {
  failures.push('startup-admin-page must not force every section card to height: 100%.');
}

if (failures.length) {
  console.error(['Admin layout regression check failed:', ...failures.map((failure) => `- ${failure}`)].join('\n'));
  process.exit(1);
}

console.log('Admin layout regression check passed.');
