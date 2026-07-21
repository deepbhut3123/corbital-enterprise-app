const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envFiles = ['.env', '.env.local'];
const parsedEnv = {};

function stripOuterQuotes(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed[trimmed.length - 1] === quote) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

for (const fileName of envFiles) {
  const filePath = path.join(projectRoot, fileName);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripOuterQuotes(trimmed.slice(separatorIndex + 1));

    if (key) {
      parsedEnv[key] = value;
    }
  }
}

for (const [key, value] of Object.entries(parsedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
