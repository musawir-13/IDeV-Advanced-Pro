const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function getGitToken() {
  const p = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n',
    encoding: 'utf8'
  });
  if (p.stdout) {
    const m = p.stdout.match(/password=(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(d || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: d });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
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

const token = getGitToken();
if (!token) {
  console.error('No GitHub token found in git credential manager.');
  process.exit(1);
}

async function main() {
  const notesPath = path.join(__dirname, '..', 'release-notes.md');
  const releaseNotes = fs.readFileSync(notesPath, 'utf8');

  console.log('1. Checking or creating GitHub release for tag v3.8.9...');
  
  // Check if release already exists
  const checkRes = await requestJson({
    hostname: 'api.github.com',
    path: '/repos/musawir-13/IDeV-Advanced-Pro/releases/tags/v3.8.9',
    method: 'GET',
    headers: {
      'User-Agent': 'IDeV-Release-Engine',
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  let releaseData = null;
  if (checkRes.status === 200 && checkRes.data.id) {
    console.log('Existing release found for v3.8.9 with id:', checkRes.data.id);
    releaseData = checkRes.data;
  } else {
    // Create new release
    const createRes = await requestJson({
      hostname: 'api.github.com',
      path: '/repos/musawir-13/IDeV-Advanced-Pro/releases',
      method: 'POST',
      headers: {
        'User-Agent': 'IDeV-Release-Engine',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    }, {
      tag_name: 'v3.8.9',
      target_commitish: 'main',
      name: 'IDeV Advanced Pro v3.8.9',
      body: releaseNotes,
      draft: false,
      prerelease: false
    });

    if (createRes.status === 201 && createRes.data.id) {
      console.log('Created GitHub Release v3.8.9 with id:', createRes.data.id);
      releaseData = createRes.data;
    } else {
      console.error('Failed to create release:', createRes.status, createRes.data);
      process.exit(1);
    }
  }

  const uploadUrl = releaseData.upload_url;
  console.log('Release URL:', releaseData.html_url);

  // Upload SHA256 file
  const sha256File = path.join(__dirname, '..', 'output', 'IDeV-Advanced-Pro-Setup-3.8.9.exe.sha256');
  await uploadAsset(uploadUrl, sha256File, 'text/plain');

  // Upload Installer executable
  const installerFile = path.join(__dirname, '..', 'output', 'IDeV-Advanced-Pro-Setup-3.8.9.exe');
  await uploadAsset(uploadUrl, installerFile, 'application/vnd.microsoft.portable-executable');

  console.log('\nAll assets published to GitHub Release successfully!');
  console.log('Release Page:', releaseData.html_url);
}

main().catch(err => {
  console.error('Error during release publication:', err);
  process.exit(1);
});
