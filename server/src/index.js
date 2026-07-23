require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  createOAuthClient,
  getAuthorizeUri,
  handleCallback,
  createEmployee,
} = require("./quickbooks");
const { loadTokens } = require("./tokenStore");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Step 1: visit this in a browser to connect this server to your QuickBooks
// Online company. Only needs to be done once (until the refresh token expires).
app.get("/api/quickbooks/connect", (req, res) => {
  const oauthClient = createOAuthClient();
  res.redirect(getAuthorizeUri(oauthClient));
});

// Step 2: QuickBooks redirects here after the user approves access.
app.get("/api/quickbooks/callback", async (req, res) => {
  try {
    const oauthClient = createOAuthClient();
    await handleCallback(oauthClient, req.url);
    res.send("QuickBooks connected. You can close this tab.");
  } catch (error) {
    console.error("QuickBooks OAuth callback failed:", error);
    res.status(500).send("Failed to connect QuickBooks. Check server logs.");
  }
});

app.get("/api/quickbooks/status", (req, res) => {
  res.json({ connected: Boolean(loadTokens()) });
});

// Maps our onboarding form fields to the subset of the QuickBooks Online
// Employee entity that's actually writable via the public Accounting API.
// QuickBooks Online Payroll (direct deposit, W-4 withholding) is NOT covered
// by this public API — Intuit restricts payroll writes to approved partners.
function toQuickBooksEmployee(employee) {
  return {
    GivenName: employee.firstName,
    FamilyName: employee.lastName,
    SSN: employee.ssn,
    BirthDate: employee.dateOfBirth,
    PrimaryPhone: { FreeFormNumber: employee.phone },
    PrimaryAddr: { Line1: employee.address },
    HiredDate: new Date().toISOString().slice(0, 10),
  };
}

app.post("/api/onboarding/submit", async (req, res) => {
  const { employee, bank, additional } = req.body;

  if (!employee) {
    return res.status(400).json({ error: "Missing employee data." });
  }

  try {
    const qboEmployee = await createEmployee(toQuickBooksEmployee(employee));

    // Bank account and W-4 details can't be pushed into QuickBooks Online
    // Payroll via the public API. Replace this with your own secure storage
    // (encrypted at rest) so payroll can enter them manually for now.
    console.log("Bank + W-4 details pending manual entry in QB Payroll:", {
      bank,
      additional,
    });

    res.json({ success: true, quickbooksEmployeeId: qboEmployee.Id });
  } catch (error) {
    console.error("Failed to create QuickBooks employee:", error);
    res.status(502).json({ error: "Failed to create employee in QuickBooks." });
  }
});

app.listen(PORT, () => {
  console.log(`Onboarding server listening on http://localhost:${PORT}`);
});
