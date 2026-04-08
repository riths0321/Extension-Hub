import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionDir = path.resolve(process.argv[2] || __dirname);

const missing = [];
const checked = new Set();

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function checkFile(relativePath, reason) {
  if (!relativePath) return;

  const normalized = relativePath.split('?')[0].split('#')[0];
  const targetPath = path.resolve(extensionDir, normalized);

  if (checked.has(`${reason}:${targetPath}`)) return;
  checked.add(`${reason}:${targetPath}`);

  if (!exists(targetPath)) {
    missing.push(`${reason}: ${normalized}`);
  }
}

function collectManifestFiles(manifest) {
  if (manifest.background?.service_worker) {
    checkFile(manifest.background.service_worker, 'Missing background service worker');
  }

  if (manifest.action?.default_popup) {
    checkFile(manifest.action.default_popup, 'Missing action popup');
  }

  const iconGroups = [manifest.icons, manifest.action?.default_icon].filter(Boolean);
  for (const icons of iconGroups) {
    for (const iconPath of Object.values(icons)) {
      checkFile(iconPath, 'Missing icon asset');
    }
  }
}

function collectHtmlAssets(htmlRelativePath) {
  const htmlPath = path.resolve(extensionDir, htmlRelativePath);
  const html = readText(htmlPath);

  const assetPatterns = [
    { regex: /<script[^>]+src="([^"]+)"/g, label: 'Missing HTML script' },
    { regex: /<link[^>]+href="([^"]+)"/g, label: 'Missing HTML stylesheet' },
  ];

  for (const { regex, label } of assetPatterns) {
    for (const match of html.matchAll(regex)) {
      const assetPath = path.resolve(path.dirname(htmlPath), match[1]);
      const relativeAssetPath = path.relative(extensionDir, assetPath);
      checkFile(relativeAssetPath, label);
    }
  }
}

function collectJsImports(relativePath) {
  const jsPath = path.resolve(extensionDir, relativePath);
  const source = readText(jsPath);
  const importRegex =
    /(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;

    const targetPath = path.resolve(path.dirname(jsPath), specifier);
    const relativeTargetPath = path.relative(extensionDir, targetPath);
    checkFile(relativeTargetPath, `Missing module import referenced by ${relativePath}`);
  }
}

function main() {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  if (!exists(manifestPath)) {
    console.error(`manifest.json not found in ${extensionDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readText(manifestPath));
  collectManifestFiles(manifest);

  if (manifest.action?.default_popup) {
    collectHtmlAssets(manifest.action.default_popup);
  }

  const jsFiles = [];
  function walk(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && fullPath.endsWith('.js')) {
        jsFiles.push(path.relative(extensionDir, fullPath));
      }
    }
  }

  walk(extensionDir);
  jsFiles.forEach(collectJsImports);

  if (missing.length > 0) {
    console.error('Build verification failed. Missing files found:\n');
    for (const issue of missing) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Build verification passed for ${extensionDir}`);
}

main();
