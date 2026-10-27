const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function getGitToken() {
  const p = spawnSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n', encoding: 'utf8' });
  if (p.stdout) {
    const m = p.stdout.match(/password=(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

const token = getGitToken();
if (!token) {
  console.error('No git token found.');
  process.exit(1);
}

function deleteAsset(id) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/musawir-13/IDeV-Advanced-Pro/releases/assets/${id}`,
      method: 'DELETE',
      headers: {
        'User-Agent': 'IDeV-Release-Engine',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, res => {
      console.log(`Deleted asset ${id}, status:`, res.statusCode);
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath, contentType) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath);
    const stat = fs.statSync(filePath);
    const parsedUrl = new URL(uploadUrl.replace(/\{.*\}/, '') + `?name=${encodeURIComponent(filename)}`);

    console.log(`Uploading ${filename} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);

    const req = https.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'IDeV-Release-Engine',
        'Authorization': 'token ' + token,
        'Content-Type': contentType,
        'Content-Length': stat.size
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`Asset ${filename} upload status:`, res.statusCode);
        resolve({ status: res.statusCode, body: d });
      });
    });

    req.on('error', reject);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function main() {
  console.log('1. Deleting old release assets with private model inclusions...');
  await deleteAsset(680862640);
  await deleteAsset(680862595);

  console.log('2. Fetching release upload URL...');
  const relRes = await new Promise((resolve) => {
    https.get({
      hostname: 'api.github.com',
      path: '/repos/musawir-13/IDeV-Advanced-Pro/releases/tags/v1.0.0',
      headers: {
        'User-Agent': 'IDeV-Release-Engine',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const uploadUrl = relRes.upload_url;
  console.log('Upload URL:', uploadUrl);

  const sha256File = path.join(__dirname, '..', 'github-release', 'output', 'IDeV-Advanced-Pro-Setup-1.0.0.exe.sha256');
  const installerFile = path.join(__dirname, '..', 'release', 'IDeV-Advanced-Pro-Setup-1.0.0.exe');

  console.log('3. Uploading clean sha256 file...');
  await uploadAsset(uploadUrl, sha256File, 'text/plain');

  console.log('4. Uploading clean installer executable...');
  await uploadAsset(uploadUrl, installerFile, 'application/vnd.microsoft.portable-executable');

  console.log('\nAll sanitized assets uploaded to GitHub Release successfully!');
}

main().catch(err => {
  console.error('Error during asset update:', err);
  process.exit(1);
});
