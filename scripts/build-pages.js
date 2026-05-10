const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('terser');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function loadLocalEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const eq = line.indexOf('=');
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      const rawValue = line.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
      }
    });
}

loadLocalEnv();

const requiredConfig = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
};

function assertFirebaseConfig() {
  const missing = Object.entries(requiredConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing Firebase build env vars: ${missing.join(', ')}`);
  }
}

function copyIntoDist(name) {
  const source = path.join(root, name);
  const target = path.join(dist, name);
  fs.cpSync(source, target, { recursive: true });
}

function writeFirebaseConfig() {
  const templatePath = path.join(root, 'js', 'firebase-config.template.js');
  let configSource = fs.readFileSync(templatePath, 'utf8');

  Object.entries(requiredConfig).forEach(([key, value]) => {
    configSource = configSource.replaceAll(`__${key}__`, value);
  });

  fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'js', 'firebase-config.js'), configSource);
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyHtml(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

async function minifyBuild() {
  const jsDir = path.join(dist, 'js');
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const result = await minify(source, {
      compress: true,
      format: { comments: false },
      mangle: true,
      module: file === 'firebase-service.js',
    });
    fs.writeFileSync(filePath, result.code);
  }

  const cssPath = path.join(dist, 'css', 'styles.css');
  fs.writeFileSync(cssPath, minifyCss(fs.readFileSync(cssPath, 'utf8')));

  const htmlPath = path.join(dist, 'index.html');
  fs.writeFileSync(htmlPath, minifyHtml(fs.readFileSync(htmlPath, 'utf8')));
}

assertFirebaseConfig();
fs.rmSync(dist, { force: true, recursive: true });
fs.mkdirSync(dist, { recursive: true });

['index.html', 'css', 'js', 'assets', 'LICENSE'].forEach(copyIntoDist);
writeFirebaseConfig();
fs.rmSync(path.join(dist, 'js', 'firebase-config.template.js'), { force: true });

minifyBuild()
  .then(() => console.log('ok - minified GitHub Pages build written to dist/'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
