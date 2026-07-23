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
function isValidBirthDate(dateOfBirth) {
  const [year] = (dateOfBirth || "").split("-");
  const currentYear = new Date().getFullYear();

  return (
    year?.length === 4 &&
    Number(year) >= currentYear - 100 &&
    Number(year) <= currentYear - 14
  );
}

function toQuickBooksEmployee(employee) {
  const qboEmployee = {
    GivenName: employee.firstName,
    FamilyName: employee.lastName,
    HiredDate: new Date().toISOString().slice(0, 10),
  };

  if (employee.ssn) qboEmployee.SSN = employee.ssn;
  if (isValidBirthDate(employee.dateOfBirth)) {
    qboEmployee.BirthDate = employee.dateOfBirth;
  } else if (employee.dateOfBirth) {
    console.warn(
      `Rejected date of birth "${employee.dateOfBirth}" for ${employee.firstName} ${employee.lastName} — not sent to QuickBooks.`,
    );
  } else {
    console.warn(
      `No date of birth received for ${employee.firstName} ${employee.lastName}.`,
    );
  }
  if (employee.phone) qboEmployee.PrimaryPhone = { FreeFormNumber: employee.phone };
  if (employee.address) qboEmployee.PrimaryAddr = { Line1: employee.address };

  return qboEmployee;
}

app.post("/api/onboarding/submit", async (req, res) => {
  const { employee, bank, additional } = req.body;

  if (!employee?.firstName || !employee?.lastName) {
    return res
      .status(400)
      .json({ error: "Employee first and last name are required." });
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
