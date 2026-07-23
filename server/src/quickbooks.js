const OAuthClient = require("intuit-oauth");
const QuickBooks = require("node-quickbooks");
const { saveTokens, loadTokens } = require("./tokenStore");

function createOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT || "sandbox",
    redirectUri: process.env.QBO_REDIRECT_URI,
  });
}

function getAuthorizeUri(oauthClient) {
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: "orcarehab-onboarding",
  });
}

async function handleCallback(oauthClient, callbackUrl) {
  const authResponse = await oauthClient.createToken(callbackUrl);
  const tokens = authResponse.getJson();
  const realmId = oauthClient.getToken().realmId;

  saveTokens({ ...tokens, realmId });

  return tokens;
}

function getQuickBooksClient() {
  const tokens = loadTokens();

  if (!tokens) {
    throw new Error(
      "QuickBooks is not connected yet. Visit /api/quickbooks/connect first.",
    );
  }

  return new QuickBooks(
    process.env.QBO_CLIENT_ID,
    process.env.QBO_CLIENT_SECRET,
    tokens.access_token,
    false,
    tokens.realmId,
    process.env.QBO_ENVIRONMENT !== "production",
    true,
    null,
    "2.0",
    tokens.refresh_token,
  );
}

function createEmployee(employeeData) {
  const qbo = getQuickBooksClient();

  return new Promise((resolve, reject) => {
    qbo.createEmployee(employeeData, (err, employee) => {
      if (err) return reject(err);
      resolve(employee);
    });
  });
}

module.exports = {
  createOAuthClient,
  getAuthorizeUri,
  handleCallback,
  createEmployee,
};
