const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.argv[2];
const ROOT = 'C:/Users/whs19/Desktop/工作台/娃子每日打卡/kid-daily-check';
const REPO = 'WuHaisang/kid-check';
const BRANCH = 'main';

const EXCLUDE_DIRS = ['node_modules', 'dist', '.git'];
const EXCLUDE_FILES = ['.DS_Store'];

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'kid-check-backup',
      },
    };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(body); }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) { console.error('API Error', res.statusCode, data); reject(new Error(data)); }
        else resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function walkDir(dir, base) {
  const files = {};
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (EXCLUDE_DIRS.includes(item)) continue;
    if (EXCLUDE_FILES.includes(item)) continue;
    const full = path.join(dir, item);
    const st = fs.statSync(full);
    if (st.isFile()) {
      const rel = path.relative(base, full).replace(/\\/g, '/');
      files[rel] = full;
    } else if (st.isDirectory()) {
      Object.assign(files, walkDir(full, base));
    }
  }
  return files;
}

async function getRefSha() {
  try {
    const ref = await api('GET', `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    return ref.object.sha;
  } catch { return null; }
}

async function backup() {
  const files = walkDir(ROOT, ROOT);
  console.log(`Found ${Object.keys(files).length} source files`);

  const treeItems = [];
  for (const [relPath, fullPath] of Object.entries(files)) {
    const content = fs.readFileSync(fullPath);
    const b64 = content.toString('base64');
    const blob = await api('POST', `/repos/${REPO}/git/blobs`, JSON.stringify({ content: b64, encoding: 'base64' }));
    treeItems.push({ path: relPath, mode: '100644', type: 'blob', sha: blob.sha });
  }
  console.log(`Created ${treeItems.length} blobs`);

  // Create tree from the current main (to preserve unrelated files)
  const baseSha = await getRefSha();
  let tree;
  if (baseSha) {
    tree = await api('POST', `/repos/${REPO}/git/trees`, JSON.stringify({ base_tree: baseSha, tree: treeItems }));
  } else {
    tree = await api('POST', `/repos/${REPO}/git/trees`, JSON.stringify({ tree: treeItems }));
  }
  console.log(`Tree: ${tree.sha}`);

  const commitBody = { message: 'Backup source code', tree: tree.sha };
  if (baseSha) commitBody.parents = [baseSha];
  const commit = await api('POST', `/repos/${REPO}/git/commits`, JSON.stringify(commitBody));
  console.log(`Commit: ${commit.sha}`);

  try {
    await api('PATCH', `/repos/${REPO}/git/refs/heads/${BRANCH}`, JSON.stringify({ sha: commit.sha, force: false }));
    console.log(`Updated ${BRANCH} branch`);
  } catch {
    await api('POST', `/repos/${REPO}/git/refs`, JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }));
    console.log(`Created ${BRANCH} branch`);
  }
  console.log('BACKUP SUCCESS!');
}

backup().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
