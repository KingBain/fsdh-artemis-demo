const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL, URLSearchParams } = require('url');

const CONFIG = {
  instanceUrl: process.env.INSTANCE_URL,
  dashboardId: process.env.DASHBOARD_ID,
  servicePrincipalId: process.env.SERVICE_PRINCIPAL_ID,
  servicePrincipalSecret: process.env.SERVICE_PRINCIPAL_SECRET,
  externalViewerId: process.env.EXTERNAL_VIEWER_ID,
  externalValue: process.env.EXTERNAL_VALUE,
  workspaceId: process.env.WORKSPACE_ID,
};

const basicAuth = Buffer.from(`${CONFIG.servicePrincipalId}:${CONFIG.servicePrincipalSecret}`).toString('base64');

async function main() {
  const missing = Object.keys(CONFIG).filter((key) => !CONFIG[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  try {
    // 1. Get the token
    console.log("Fetching scoped token...");
    const token = await getScopedToken();
    console.log("Token generated successfully!");

    // 2. Read your existing index.html
    console.log("Reading index.html...");
    let html = fs.readFileSync('index.html', 'utf-8');

    // 3. Inject the variables (mimicking your python script)
    const replacements = {
      "__DATABRICKS_INSTANCE_URL__": CONFIG.instanceUrl,
      "__DATABRICKS_WORKSPACE_ID__": CONFIG.workspaceId,
      "__DATABRICKS_DASHBOARD_ID__": CONFIG.dashboardId,
      "__DATABRICKS_TOKEN__": token,
    };

    for (const [oldStr, newStr] of Object.entries(replacements)) {
      html = html.split(oldStr).join(newStr);
    }

    // 4. Save the updated index.html
    fs.writeFileSync('index.html', html, 'utf-8');
    console.log("Successfully injected token into index.html!");

  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

async function getScopedToken() {
  // Step A: Get all-api token
  const { data: { access_token: oidcToken } } = await httpRequest(`${CONFIG.instanceUrl}/oidc/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'all-apis',
    }),
  });

  // Step B: Get token info
  const tokenInfoUrl = new URL(
    `${CONFIG.instanceUrl}/api/2.0/lakeview/dashboards/${CONFIG.dashboardId}/published/tokeninfo`
  );
  tokenInfoUrl.searchParams.set('external_viewer_id', CONFIG.externalViewerId);
  tokenInfoUrl.searchParams.set('external_value', CONFIG.externalValue);

  const { data: tokenInfo } = await httpRequest(tokenInfoUrl.toString(), {
    headers: { Authorization: `Bearer ${oidcToken}` },
  });

  // Step C: Generate scoped token
  const { authorization_details, ...params } = tokenInfo;
  
  const bodyParams = new URLSearchParams({
    grant_type: 'client_credentials',
    ...params,
    authorization_details: JSON.stringify(authorization_details),
  });

  const { data: scopedResponse } = await httpRequest(`${CONFIG.instanceUrl}/oidc/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: bodyParams,
  });

  if (!scopedResponse.access_token) {
      throw new Error("Scoped token response did not contain an access_token. Response: " + JSON.stringify(scopedResponse));
  }

  return scopedResponse.access_token;
}

function httpRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    const options = new URL(url);
    options.method = method;
    options.headers = headers;

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ data: JSON.parse(data) }); } 
          catch { resolve({ data }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) { req.write(body); } 
      else if (body instanceof URLSearchParams) { req.write(body.toString()); } 
      else { req.write(JSON.stringify(body)); }
    }
    req.end();
  });
}

main();