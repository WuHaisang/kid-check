const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.argv[2];
const DIST = 'C:/Users/whs19/Desktop/工作台/娃子每日打卡/kid-daily-check/dist';
const REPO = 'WuHaisang/kid-check';

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'kid-check-deploy',
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
    if (item.startsWith('.') && item !== '.nojekyll') continue;
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

async function deploy() {
  const files = walkDir(DIST, DIST);
  console.log(`Found ${Object.keys(files).length} files`);

  // Create blobs
  const treeItems = [];
  for (const [relPath, fullPath] of Object.entries(files)) {
    const content = fs.readFileSync(fullPath);
    const b64 = content.toString('base64');
    const blob = await api('POST', `/repos/${REPO}/git/blobs`, JSON.stringify({ content: b64, encoding: 'base64' }));
    treeItems.push({ path: relPath, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  blob: ${relPath}`);
  }

  // Create tree
  const tree = await api('POST', `/repos/${REPO}/git/trees`, JSON.stringify({ tree: treeItems }));
  console.log(`Tree: ${tree.sha}`);

  // Create commit
  const commit = await api('POST', `/repos/${REPO}/git/commits`, JSON.stringify({ message: 'Deploy via API', tree: tree.sha }));
  console.log(`Commit: ${commit.sha}`);

  // Update or create ref
  try {
    await api('PATCH', `/repos/${REPO}/git/refs/heads/gh-pages`, JSON.stringify({ sha: commit.sha, force: true }));
    console.log('Updated gh-pages branch');
  } catch {
    await api('POST', `/repos/${REPO}/git/refs`, JSON.stringify({ ref: 'refs/heads/gh-pages', sha: commit.sha }));
    console.log('Created gh-pages branch');
  }
  console.log('DEPLOY SUCCESS!');
  console.log(`URL: https://wuhaisang.github.io/kid-check/`);
  console.log('(Pages可能需要1-2分钟生效)');
}

deploy().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
