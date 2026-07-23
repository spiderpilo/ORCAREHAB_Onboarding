const state = { submissions: [] };

function showLogin() {
  document.getElementById("login-view").hidden = false;
  document.getElementById("dashboard-view").hidden = true;
}

function showDashboard() {
  document.getElementById("login-view").hidden = true;
  document.getElementById("dashboard-view").hidden = false;
  loadSubmissions();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function field(label, value) {
  if (!value) return "";
  return `
    <div class="detail-field">
      <span class="label">${label}</span>
      <span class="value">${escapeHtml(value)}</span>
    </div>
  `;
}

async function checkSession() {
  const res = await fetch("/api/admin/session");
  const data = await res.json();
  return data.authenticated;
}

async function loadSubmissions() {
  const res = await fetch("/api/admin/submissions");

  if (!res.ok) {
    if (res.status === 401) showLogin();
    return;
  }

  state.submissions = await res.json();
  renderSubmissions();
}

function renderSubmissions() {
  const table = document.getElementById("submissions-table");
  const body = document.getElementById("submissions-body");
  const empty = document.getElementById("empty-state");

  if (state.submissions.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    return;
  }

  table.hidden = false;
  empty.hidden = true;
  body.innerHTML = "";

  for (const submission of state.submissions) {
    const tr = document.createElement("tr");

    const submittedDate = new Date(submission.created_at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const badgeClass = submission.quickbooks_synced ? "synced" : "pending";
    const badgeText = submission.quickbooks_synced ? "Synced" : "Pending manual entry";

    tr.innerHTML = `
      <td>${escapeHtml(submission.first_name)} ${escapeHtml(submission.last_name)}</td>
      <td>${submittedDate}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td class="row-actions">
        <button data-action="view" data-id="${submission.id}">View</button>
        <button data-action="remove" data-id="${submission.id}" class="danger">Remove</button>
      </td>
    `;

    body.appendChild(tr);
  }
}

async function openDetail(id) {
  const res = await fetch(`/api/admin/submissions/${id}`);
  if (!res.ok) return;

  const data = await res.json();
  const { employee, bank, additional } = data;

  const filesHtml = [
    data.driverLicensePath
      ? `<a class="file-link" href="/api/admin/uploads/${data.driverLicensePath}" target="_blank" rel="noopener">View driver's license photo</a>`
      : "",
    data.resumePath
      ? `<a class="file-link" href="/api/admin/uploads/${data.resumePath}" target="_blank" rel="noopener">View resume</a>`
      : "",
  ]
    .filter(Boolean)
    .join("<br/>");

  const splitHtml = bank?.splitDeposit
    ? `
      <p style="margin: 14px 0 6px; font-weight:700; color: var(--blue);">
        Split deposit — Account 2 (${bank.primaryAllocation ? 100 - Number(bank.primaryAllocation) : 0}%)
      </p>
      <div class="detail-grid">
        ${field("Bank name", bank?.secondaryAccount?.bankName)}
        ${field("Account type", bank?.secondaryAccount?.accountType)}
        ${field("Routing number", bank?.secondaryAccount?.routingNumber)}
        ${field("Account number", bank?.secondaryAccount?.accountNumber)}
      </div>
    `
    : "";

  document.getElementById("detail-content").innerHTML = `
    <div class="detail-section">
      <h2>${escapeHtml(employee.firstName)} ${escapeHtml(employee.lastName)}</h2>
      <p style="color:var(--text-muted); margin-top:-8px;">
        ${
          data.quickbooksSynced
            ? `Synced to QuickBooks (Employee ID ${escapeHtml(data.quickbooksEmployeeId)})`
            : "Not yet synced to QuickBooks — needs manual review"
        }
      </p>
    </div>

    <div class="detail-section">
      <h2>Employee information</h2>
      <div class="detail-grid">
        ${field("Date of birth", employee.dateOfBirth)}
        ${field("Phone", employee.phone)}
        ${field("Address", employee.address)}
        ${field("Degree", employee.degree)}
        ${field("SSN", employee.ssn)}
      </div>
      ${filesHtml ? `<div style="margin-top:14px;">${filesHtml}</div>` : ""}
    </div>

    <div class="detail-section">
      <h2>Direct deposit</h2>
      <div class="detail-grid">
        ${field("Bank name", bank?.primaryAccount?.bankName)}
        ${field("Account type", bank?.primaryAccount?.accountType)}
        ${field("Routing number", bank?.primaryAccount?.routingNumber)}
        ${field("Account number", bank?.primaryAccount?.accountNumber)}
      </div>
      ${splitHtml}
    </div>

    <div class="detail-section">
      <h2>Emergency contact &amp; tax withholding</h2>
      <div class="detail-grid">
        ${field("Contact name", additional?.emergencyContactName)}
        ${field("Relationship", additional?.emergencyContactRelationship)}
        ${field("Contact phone", additional?.emergencyContactPhone)}
        ${field("Work authorization", additional?.workAuthorization)}
        ${field("Filing status", additional?.filingStatus)}
        ${field("Dependents amount", additional?.dependentsAmount)}
        ${field("Extra withholding", additional?.extraWithholding)}
      </div>
    </div>
  `;

  document.getElementById("detail-overlay").hidden = false;
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: formData.get("username"),
      password: formData.get("password"),
    }),
  });

  if (res.ok) {
    event.target.reset();
    showDashboard();
  } else {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.error || "Invalid credentials.";
    errorEl.hidden = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  showLogin();
});

document.getElementById("submissions-body").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { id, action } = button.dataset;

  if (action === "view") {
    await openDetail(id);
  } else if (action === "remove") {
    if (!confirm("Remove this submission permanently? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
    if (res.ok) loadSubmissions();
  }
});

document.getElementById("detail-close").addEventListener("click", () => {
  document.getElementById("detail-overlay").hidden = true;
});

document.getElementById("detail-overlay").addEventListener("click", (event) => {
  if (event.target.id === "detail-overlay") {
    document.getElementById("detail-overlay").hidden = true;
  }
});

(async function init() {
  const authenticated = await checkSession();
  if (authenticated) {
    showDashboard();
  } else {
    showLogin();
  }
})();
