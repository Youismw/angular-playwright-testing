import path from 'path';

if (path.basename(process.cwd()).toLowerCase() === 'tests') {
  process.chdir(path.resolve(process.cwd(), '..'));
}

export { default } from '../playwright.config.js';
