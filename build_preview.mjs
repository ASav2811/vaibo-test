// Необязательная сборка одной HTML-страницы для просмотра без сервера.
// GitHub Pages использует исходный index.html с модулями без какой-либо сборки.
import { readFile, writeFile } from 'node:fs/promises';

const read = file => readFile(new URL(`./${file}`, import.meta.url), 'utf8');
const [html, css, content, scoring, app] = await Promise.all([
  read('index.html'), read('styles.css'), read('content.mjs'), read('scoring.mjs'), read('app.mjs'),
]);

const flatten = source => source
  .replace(/^import\s.+?\sfrom\s['"].+?['"];?\s*$/gm, '')
  .replace(/^export\s+/gm, '');
const javascript = [content, scoring, app].map(flatten).join('\n\n');

const bundled = html
  .replace(/<link rel="stylesheet" href="\.\/styles\.css"\s*\/>/, `<style>\n${css}\n</style>`)
  .replace(/\s*<script src="\.\/app\.mjs" type="module"><\/script>/, '')
  .replace('</body>', `<script>\n${javascript}\n</script>\n</body>`);

await writeFile(new URL('./preview_offline.html', import.meta.url), bundled);
console.log('Создан preview_offline.html — работает и без интернета.');
