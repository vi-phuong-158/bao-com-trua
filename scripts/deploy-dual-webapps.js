#!/usr/bin/env node

/**
 * Canonical Dual Web App Deployment Script for Google Apps Script
 *
 * Manages two independent deployments from the same codebase:
 * 1. PUBLIC deployment:
 *    - Execute As: USER_DEPLOYING
 *    - Access: ANYONE_ANONYMOUS
 *    - Renders user index without requiring Google login.
 * 2. ADMIN deployment:
 *    - Execute As: USER_ACCESSING
 *    - Access: ANYONE (requires Google Account login)
 *    - Enforces server-side assertAdmin_() on active Google identity.
 *
 * Security:
 * - Zero hardcoded tokens or secrets. Credentials are read dynamically from local clasp auth (~/.clasprc.json).
 * - Existing deployment IDs are updated in-place; no duplicate deployments created.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// Canonical Deployment Configuration
const CONFIG = {
  ADMIN_DEPLOYMENT_ID: 'AKfycbx1rZMgkbvwM7wfrGMb50XZt1NDmEzr_4T0oUdG-91Q9DW2REt4Gp8d8xUd9ItiKziFXA',
  PUBLIC_DEPLOYMENT_ID: 'AKfycbwZAqISWkG8MWJC_QUd5446qH-OHyLd5jU6MS63upKDqKspPG0tZAKYrTP05od6YPz8_Q',
  LEGACY_PUBLIC_DEPLOYMENT_ID: 'AKfycbwxL5XWo8Bti9IWe7bR_i3KnBdk1YhemSCb3NiLRdVf7jNYTsGIncJLDuL35iEQTSPVqA',
  PROJECT_ROOT: path.resolve(__dirname, '..'),
  CLASP_JSON_NAME: '.clasp.json',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
};

function requestHttp(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || body}`));
          } else {
            resolve(parsed);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(body);
          }
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function resolveClaspRc() {
  const customPath = process.env.CLASPRC_PATH;
  if (customPath && fs.existsSync(customPath)) {
    return JSON.parse(fs.readFileSync(customPath, 'utf8'));
  }
  const defaultPath = path.join(os.homedir(), '.clasprc.json');
  if (fs.existsSync(defaultPath)) {
    return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  }
  throw new Error(`Could not find .clasprc.json in ${defaultPath}. Run 'clasp login' first.`);
}

function resolveScriptId() {
  const claspJsonPath = path.join(CONFIG.PROJECT_ROOT, CONFIG.CLASP_JSON_NAME);
  if (!fs.existsSync(claspJsonPath)) {
    throw new Error(`Missing ${CONFIG.CLASP_JSON_NAME} in project root (${CONFIG.PROJECT_ROOT}).`);
  }
  const claspJson = JSON.parse(fs.readFileSync(claspJsonPath, 'utf8'));
  if (!claspJson.scriptId) {
    throw new Error(`Missing scriptId in ${CONFIG.CLASP_JSON_NAME}`);
  }
  return claspJson.scriptId;
}

async function getAccessToken(rc) {
  const tokenEntry = rc.tokens?.default || rc.tokens;
  if (!tokenEntry) throw new Error('Invalid .clasprc.json: tokens object missing');

  const postData = [
    'client_id=' + encodeURIComponent(tokenEntry.client_id),
    'client_secret=' + encodeURIComponent(tokenEntry.client_secret),
    'refresh_token=' + encodeURIComponent(tokenEntry.refresh_token),
    'grant_type=refresh_token'
  ].join('&');

  const tokenData = await requestHttp('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, postData);

  if (!tokenData.access_token) {
    throw new Error(`Failed to refresh Google OAuth access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

function readSourceFiles() {
  const files = [];
  const required = [
    { name: 'Code', type: 'SERVER_JS', file: 'Code.gs' },
    { name: 'Admin', type: 'SERVER_JS', file: 'Admin.gs' },
    { name: 'Index', type: 'HTML', file: 'Index.html' },
    { name: 'AdminDashboard', type: 'HTML', file: 'AdminDashboard.html' },
  ];

  for (const item of required) {
    const fullPath = path.join(CONFIG.PROJECT_ROOT, item.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file not found: ${item.file}`);
    }
    files.push({
      name: item.name,
      type: item.type,
      source: fs.readFileSync(fullPath, 'utf8'),
    });
  }
  return files;
}

async function main() {
  console.log('🍚 Canonical Dual Web App Deployment Starting...\n');

  const rc = resolveClaspRc();
  const scriptId = resolveScriptId();
  const token = await getAccessToken(rc);
  const sourceFiles = readSourceFiles();

  const adminManifest = {
    timeZone: CONFIG.TIMEZONE,
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    webapp: {
      executeAs: 'USER_ACCESSING',
      access: 'ANYONE',
    },
  };

  const publicManifest = {
    timeZone: CONFIG.TIMEZONE,
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    webapp: {
      executeAs: 'USER_DEPLOYING',
      access: 'ANYONE_ANONYMOUS',
    },
  };

  // ==========================================
  // PHASE 1: ADMIN VERSION & DEPLOYMENT
  // ==========================================
  console.log('▶ [1/4] Preparing Admin Web App version (USER_ACCESSING / ANYONE)...');
  const adminProjectContent = {
    files: [
      { name: 'appsscript', type: 'JSON', source: JSON.stringify(adminManifest, null, 2) },
      ...sourceFiles,
    ],
  };

  await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/content`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify(adminProjectContent)
  );

  const timestamp = new Date().toISOString();
  const adminVersion = await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/versions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify({
      description: `Admin Web App (USER_ACCESSING / ANYONE) - ${timestamp}`,
    })
  );
  const adminVersionNumber = adminVersion.versionNumber;
  console.log(`  ✓ Admin Version created: v${adminVersionNumber}`);

  console.log(`▶ [2/4] Updating existing Admin deployment ${CONFIG.ADMIN_DEPLOYMENT_ID}...`);
  await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/deployments/${CONFIG.ADMIN_DEPLOYMENT_ID}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify({
      deploymentConfig: {
        scriptId,
        versionNumber: adminVersionNumber,
        description: 'Admin Web App (Guarded / Execute as User Accessing)',
        manifestFileName: 'appsscript',
      },
    })
  );
  console.log(`  ✓ Admin deployment updated to v${adminVersionNumber}`);

  // ==========================================
  // PHASE 2: PUBLIC VERSION & DEPLOYMENT
  // ==========================================
  console.log('▶ [3/4] Preparing Public Web App version (USER_DEPLOYING / ANYONE_ANONYMOUS)...');
  const publicProjectContent = {
    files: [
      { name: 'appsscript', type: 'JSON', source: JSON.stringify(publicManifest, null, 2) },
      ...sourceFiles,
    ],
  };

  await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/content`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify(publicProjectContent)
  );

  const publicVersion = await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/versions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify({
      description: `Public Web App (USER_DEPLOYING / ANYONE_ANONYMOUS) - ${timestamp}`,
    })
  );
  const publicVersionNumber = publicVersion.versionNumber;
  console.log(`  ✓ Public Version created: v${publicVersionNumber}`);

  console.log(`▶ [4/4] Updating existing Public deployment ${CONFIG.PUBLIC_DEPLOYMENT_ID}...`);
  await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/deployments/${CONFIG.PUBLIC_DEPLOYMENT_ID}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    JSON.stringify({
      deploymentConfig: {
        scriptId,
        versionNumber: publicVersionNumber,
        description: 'Public Web App (Anyone Anonymous / Execute as Deployer)',
        manifestFileName: 'appsscript',
      },
    })
  );
  console.log(`  ✓ Public deployment updated to v${publicVersionNumber}`);

  if (CONFIG.LEGACY_PUBLIC_DEPLOYMENT_ID) {
    await requestHttp(
      `https://script.googleapis.com/v1/projects/${scriptId}/deployments/${CONFIG.LEGACY_PUBLIC_DEPLOYMENT_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
      JSON.stringify({
        deploymentConfig: {
          scriptId,
          versionNumber: publicVersionNumber,
          description: 'Public Web App Legacy Alias (Anyone Anonymous / Execute as Deployer)',
          manifestFileName: 'appsscript',
        },
      })
    );
    console.log(`  ✓ Legacy Public deployment alias updated to v${publicVersionNumber}`);
  }

  // ==========================================
  // PHASE 3: VERIFICATION & SUMMARY
  // ==========================================
  console.log('\n--- VERIFYING DEPLOYMENTS ON GOOGLE APPS SCRIPT ---');
  const allDeps = await requestHttp(
    `https://script.googleapis.com/v1/projects/${scriptId}/deployments`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  const adminDep = allDeps.deployments?.find(d => d.deploymentId === CONFIG.ADMIN_DEPLOYMENT_ID);
  const publicDep = allDeps.deployments?.find(d => d.deploymentId === CONFIG.PUBLIC_DEPLOYMENT_ID);

  const adminEntry = adminDep?.entryPoints?.[0]?.webApp?.entryPointConfig;
  const publicEntry = publicDep?.entryPoints?.[0]?.webApp?.entryPointConfig;

  console.log('\n' + '='.repeat(68));
  console.log('              DUAL DEPLOYMENT REPORT                ');
  console.log('='.repeat(68));
  console.log(`PUBLIC URL:             https://script.google.com/macros/s/${CONFIG.PUBLIC_DEPLOYMENT_ID}/exec`);
  console.log(`ADMIN URL:              https://script.google.com/macros/s/${CONFIG.ADMIN_DEPLOYMENT_ID}/exec?admin=1`);
  console.log(`PUBLIC executeAs/access: ${publicEntry?.executeAs} / ${publicEntry?.access} (v${publicDep?.deploymentConfig?.versionNumber})`);
  console.log(`ADMIN executeAs/access:  ${adminEntry?.executeAs} / ${adminEntry?.access} (v${adminDep?.deploymentConfig?.versionNumber})`);
  console.log(`Admin Version:          v${adminVersionNumber}`);
  console.log(`Public Version:         v${publicVersionNumber}`);
  console.log('='.repeat(68) + '\n');

  // Strict assertions
  if (adminEntry?.executeAs !== 'USER_ACCESSING' || adminEntry?.access !== 'ANYONE') {
    throw new Error(`Admin deployment verification FAILED: unexpected entryPoint config ${JSON.stringify(adminEntry)}`);
  }
  if (publicEntry?.executeAs !== 'USER_DEPLOYING' || publicEntry?.access !== 'ANYONE_ANONYMOUS') {
    throw new Error(`Public deployment verification FAILED: unexpected entryPoint config ${JSON.stringify(publicEntry)}`);
  }

  console.log('✅ DUAL DEPLOYMENT HARDENING VERIFICATION: ALL CHECKS PASSED.\n');
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
