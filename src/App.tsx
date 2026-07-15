import { useEffect, useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import logo from "./assets/orca-logo.png";
import "./App.css";

type Page = "welcome" | "employee-info" | "bank-info";

interface EmployeeForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  degree: string;
  ssn: string;
  driverLicensePhoto: File | null;
  resume: File | null;
}

interface BankForm {
  bankName: string;
  accountType: string;
  routingNumber: string;
  accountNumber: string;
}

const initialForm: EmployeeForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  address: "",
  degree: "",
  ssn: "",
  driverLicensePhoto: null,
  resume: null,
};

const initialBankForm: BankForm = {
  bankName: "",
  accountType: "",
  routingNumber: "",
  accountNumber: "",
};

function formatSSN(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 9);

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  }

  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
}

function formatDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

const DEV_PAGES: { label: string; page: Page; submitted?: boolean }[] = [
  { label: "Welcome", page: "welcome" },
  { label: "Employee info", page: "employee-info" },
  { label: "Bank info", page: "bank-info" },
  { label: "Success", page: "bank-info", submitted: true },
];

function DevNav({
  onNavigate,
}: {
  onNavigate: (page: Page, submitted: boolean) => void;
}) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="dev-nav">
      <span>DEV</span>
      {DEV_PAGES.map(({ label, page, submitted }) => (
        <button
          key={label}
          type="button"
          onClick={() => onNavigate(page, Boolean(submitted))}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("welcome");
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [bankForm, setBankForm] = useState<BankForm>(initialBankForm);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!form.driverLicensePhoto) {
      setLicensePreview(null);
      return;
    }

    const url = URL.createObjectURL(form.driverLicensePhoto);
    setLicensePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [form.driverLicensePhoto]);

  const updateField = (field: keyof EmployeeForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: field === "ssn" ? formatSSN(value) : value,
    }));
  };

  const updateBankField = (field: keyof BankForm, value: string) => {
    setBankForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === "routingNumber"
          ? formatDigits(value, 9)
          : field === "accountNumber"
            ? formatDigits(value, 17)
            : value,
    }));
  };

  const handleLicenseChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((currentForm) => ({
      ...currentForm,
      driverLicensePhoto: file,
    }));
  };

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((currentForm) => ({
      ...currentForm,
      resume: file,
    }));
  };

  const handleEmployeeSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ssnNumbers = form.ssn.replace(/\D/g, "");

    if (ssnNumbers.length !== 9) {
      alert("Please enter a valid 9-digit Social Security number.");
      return;
    }

    if (!form.driverLicensePhoto) {
      alert("Please attach a photo of your driver's license.");
      return;
    }

    if (!form.resume) {
      alert("Please attach your resume.");
      return;
    }

    // Replace this with a secure request to your backend.
    // Never save an SSN in localStorage or sessionStorage.
    console.log({
      ...form,
      ssn: ssnNumbers,
    });

    setPage("bank-info");
  };

  const handleBankSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (bankForm.routingNumber.length !== 9) {
      alert("Please enter a valid 9-digit routing number.");
      return;
    }

    if (bankForm.accountNumber.length < 4) {
      alert("Please enter a valid account number.");
      return;
    }

    // Replace this with a secure request to your backend.
    // Never save bank account details in localStorage or sessionStorage.
    console.log(bankForm);

    setIsSubmitted(true);
  };

  const handleDevNavigate = (targetPage: Page, submitted: boolean) => {
    setPage(targetPage);
    setIsSubmitted(submitted);
  };

  if (page === "welcome") {
    return (
      <main className="app-shell">
        <DevNav onNavigate={handleDevNavigate} />
        <section className="welcome-card">
          <img
            className="welcome-logo"
            src={logo}
            alt="ORCA Rehab"
          />

          <div className="welcome-content">
            <p className="eyebrow">NEW EMPLOYEE PORTAL</p>

            <h1>
              Welcome to <span>ORCA REHAB</span>
            </h1>

            <p className="welcome-description">
              We’re excited to have you join our team. This secure onboarding
              portal will guide you through the information needed to get
              started.
            </p>

            <button
              className="primary-button"
              type="button"
              onClick={() => setPage("employee-info")}
            >
              Continue
              <span aria-hidden="true">→</span>
            </button>

            <p className="security-message">
              Your information is kept private and secure.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className="app-shell">
        <DevNav onNavigate={handleDevNavigate} />
        <section className="form-card success-card">
          <div className="success-icon">✓</div>
          <p className="eyebrow">INFORMATION RECEIVED</p>
          <h1>Thank you, {form.firstName}.</h1>
          <p>
            Your employee and banking information has been submitted. Our
            team will follow up with the next steps of onboarding.
          </p>
        </section>
      </main>
    );
  }

  if (page === "bank-info") {
    return (
      <main className="app-shell">
        <DevNav onNavigate={handleDevNavigate} />
        <section className="form-card">
          <button
            className="back-button"
            type="button"
            onClick={() => setPage("employee-info")}
          >
            ← Back
          </button>

          <header className="form-header">
            <img className="form-logo" src={logo} alt="ORCA Rehab" />

            <div>
              <p className="eyebrow">STEP 2 OF 2</p>
              <h1>Direct Deposit Information</h1>
              <p>
                Please enter your bank account details for direct deposit
                payroll setup.
              </p>
            </div>
          </header>

          <div className="progress-track" aria-label="Onboarding progress">
            <div className="progress-value" style={{ width: "100%" }} />
          </div>

          <form className="employee-form" onSubmit={handleBankSubmit}>
            <label className="form-field">
              <span>Bank name</span>
              <input
                type="text"
                name="bankName"
                autoComplete="off"
                placeholder="Enter your bank's name"
                value={bankForm.bankName}
                onChange={(event) =>
                  updateBankField("bankName", event.target.value)
                }
                required
              />
            </label>

            <label className="form-field">
              <span>Account type</span>
              <select
                name="accountType"
                value={bankForm.accountType}
                onChange={(event) =>
                  updateBankField("accountType", event.target.value)
                }
                required
              >
                <option value="" disabled>
                  Select account type
                </option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </label>

            <div className="field-row">
              <label className="form-field">
                <span>Routing number</span>
                <input
                  type="password"
                  name="routingNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="9-digit routing number"
                  maxLength={9}
                  value={bankForm.routingNumber}
                  onChange={(event) =>
                    updateBankField("routingNumber", event.target.value)
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Account number</span>
                <input
                  type="password"
                  name="accountNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Account number"
                  maxLength={17}
                  value={bankForm.accountNumber}
                  onChange={(event) =>
                    updateBankField("accountNumber", event.target.value)
                  }
                  required
                />
              </label>
            </div>

            <div className="form-footer">
              <p>All fields are required.</p>

              <button className="primary-button" type="submit">
                Submit
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <DevNav onNavigate={handleDevNavigate} />
      <section className="form-card">
        <button
          className="back-button"
          type="button"
          onClick={() => setPage("welcome")}
        >
          ← Back
        </button>

        <header className="form-header">
          <img className="form-logo" src={logo} alt="ORCA Rehab" />

          <div>
            <p className="eyebrow">STEP 1 OF 2</p>
            <h1>Employee Information</h1>
            <p>Please enter your legal information exactly as it appears on official records.</p>
          </div>
        </header>

        <div className="progress-track" aria-label="Onboarding progress">
          <div className="progress-value" style={{ width: "50%" }} />
        </div>

        <form className="employee-form" onSubmit={handleEmployeeSubmit}>
          <div className="field-row">
            <label className="form-field">
              <span>First name</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder="Enter your first name"
                value={form.firstName}
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
                required
              />
            </label>

            <label className="form-field">
              <span>Last name</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Enter your last name"
                value={form.lastName}
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
                required
              />
            </label>
          </div>

          <div className="field-row">
            <label className="form-field">
              <span>Date of birth</span>
              <input
                type="date"
                name="dateOfBirth"
                autoComplete="bday"
                value={form.dateOfBirth}
                onChange={(event) =>
                  updateField("dateOfBirth", event.target.value)
                }
                required
              />
            </label>

            <label className="form-field">
              <span>Degree</span>
              <input
                type="text"
                name="degree"
                placeholder="e.g. Nursing, Engineering"
                value={form.degree}
                onChange={(event) => updateField("degree", event.target.value)}
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span>Home address</span>
            <input
              type="text"
              name="address"
              autoComplete="street-address"
              placeholder="Street address, city, state, ZIP code"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Social Security number</span>
            <input
              type="password"
              name="ssn"
              inputMode="numeric"
              autoComplete="off"
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              value={form.ssn}
              onChange={(event) => updateField("ssn", event.target.value)}
              required
            />

            <small>
              Your Social Security number should only be transmitted through a
              secure, encrypted connection.
            </small>
          </label>

          <label className="form-field">
            <span>Driver's license photo</span>
            <input
              type="file"
              name="driverLicensePhoto"
              accept="image/*"
              onChange={handleLicenseChange}
              required
            />

            {licensePreview && (
              <img
                className="license-preview"
                src={licensePreview}
                alt="Driver's license preview"
              />
            )}
          </label>

          <label className="form-field">
            <span>Resume</span>
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeChange}
              required
            />

            {form.resume && (
              <small className="file-name">{form.resume.name}</small>
            )}
          </label>

          <div className="form-footer">
            <p>All fields are required.</p>

            <button className="primary-button" type="submit">
              Save and continue
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default App;
