import fs from 'fs';
import path from 'path';

const src = path.resolve('editor/dist');
const dest = path.resolve('dist/editor');

if (!fs.existsSync(src)) {
  console.error(`Error: Source editor build directory not found: ${src}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied editor build to ${dest}`);
