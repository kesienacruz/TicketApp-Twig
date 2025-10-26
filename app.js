/********************************************************
 * Constants / Utilities
 ********************************************************/
const ALLOWED_STATUS = ["open", "in_progress", "closed"];
const LS_KEYS = {
  SESSION: "ticketapp_session",
  USERS: "ticketapp_users",
  TICKETS: "ticketapp_tickets",
};

const MSG_SESSION_EXPIRED =
  "Your session has expired — please log in again.";
const MSG_LOAD_ERROR = "Failed to load tickets. Please retry.";
const MSG_DELETE_ERROR = "Failed to delete ticket. Please retry.";

const TEST_USER = {
  email: "test@ticketapp.test",
  password: "password123",
};

// helpers for storage
function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJSON(key, val) {
  window.localStorage.setItem(key, JSON.stringify(val));
}
function removeKey(key) {
  window.localStorage.removeItem(key);
}

// toast helpers (screenreader-friendly)
function toastPolite(msg) {
  const el = document.getElementById("toast-live-polite");
  if (el) el.textContent = msg;
}
function toastAssertive(msg) {
  const el = document.getElementById("toast-live-assertive");
  if (el) el.textContent = msg;
}

/********************************************************
 * Auth API
 ********************************************************/
function ensureSeedUser() {
  const users = readJSON(LS_KEYS.USERS, []);
  const exists = users.some(
    (u) =>
      u.email?.toLowerCase() === TEST_USER.email.toLowerCase() &&
      u.password === TEST_USER.password
  );
  if (!exists) {
    writeJSON(LS_KEYS.USERS, [...users, TEST_USER]);
  }
}

function signup({ email, password }) {
  ensureSeedUser();

  if (!email || !password) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Email and password are required.",
        details: {
          fields: {
            email: !email ? "Required" : undefined,
            password: !password ? "Required" : undefined,
          },
        },
      },
    };
  }
  if (password.length < 6) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Password must be at least 6 characters.",
        details: { fields: { password: "Too short" } },
      },
    };
  }

  const users = readJSON(LS_KEYS.USERS, []);
  const existsEmail = users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (existsEmail) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "That email is already registered.",
        details: { fields: { email: "Already in use" } },
      },
    };
  }

  writeJSON(LS_KEYS.USERS, [...users, { email, password }]);
  writeJSON(LS_KEYS.SESSION, { email });
  return { ok: true, user: { email } };
}

function login({ email, password }) {
  ensureSeedUser();

  if (!email || !password) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Email and password are required.",
        details: {
          fields: {
            email: !email ? "Required" : undefined,
            password: !password ? "Required" : undefined,
          },
        },
      },
    };
  }

  const users = readJSON(LS_KEYS.USERS, []);
  const found = users.find(
    (u) =>
      u.email?.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );
  if (!found) {
    return {
      ok: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
        details: {
          fields: {
            email: "Invalid credentials",
            password: "Invalid credentials",
          },
        },
      },
    };
  }

  writeJSON(LS_KEYS.SESSION, { email: found.email });
  return { ok: true, user: { email: found.email } };
}

function logout() {
  removeKey(LS_KEYS.SESSION);
}

function getSession() {
  const s = readJSON(LS_KEYS.SESSION, null);
  if (!s || !s.email) return null;
  return s;
}

/********************************************************
 * Tickets API
 ********************************************************/
const FAILURE_RATE = 0; // set >0 to simulate random network errors

function validateTicketFields({ title, status, description }) {
  if (!title || !title.trim()) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Title is required.",
        details: { fields: { title: "Title is required." } },
      },
    };
  }
  if (!ALLOWED_STATUS.includes(status)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Status is invalid.",
        details: {
          fields: {
            status: "Must be open, in_progress, or closed.",
          },
        },
      },
    };
  }
  if (description && description.length > 500) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Description cannot exceed 500 characters.",
        details: {
          fields: {
            description: "Too long (max 500 chars)",
          },
        },
      },
    };
  }
  return { ok: true };
}

function fetchTickets() {
  if (Math.random() < FAILURE_RATE) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Failed to load tickets. Please retry.",
      },
    };
  }
  const arr = readJSON(LS_KEYS.TICKETS, []);
  return { ok: true, tickets: Array.isArray(arr) ? arr : [] };
}

function createTicket({ title, description, status }) {
  const check = validateTicketFields({ title, status, description });
  if (!check.ok) return check;

  const now = new Date().toISOString();
  const all = readJSON(LS_KEYS.TICKETS, []);

  const newTicket = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: title.trim(),
    description: description?.trim() || "",
    status,
    createdAt: now,
    updatedAt: now,
  };

  writeJSON(LS_KEYS.TICKETS, [newTicket, ...all]);
  return { ok: true, ticket: newTicket };
}

function updateTicket({ id, title, description, status }) {
  const check = validateTicketFields({ title, status, description });
  if (!check.ok) return check;
  if (!id) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Missing ticket ID.",
      },
    };
  }

  const all = readJSON(LS_KEYS.TICKETS, []);
  const next = all.map((t) =>
    t.id === id
      ? {
          ...t,
          title: title.trim(),
          description: description?.trim() || "",
          status,
          updatedAt: new Date().toISOString(),
        }
      : t
  );
  writeJSON(LS_KEYS.TICKETS, next);
  return { ok: true };
}

function deleteTicket(id) {
  if (Math.random() < FAILURE_RATE) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: MSG_DELETE_ERROR,
      },
    };
  }
  const all = readJSON(LS_KEYS.TICKETS, []);
  const next = all.filter((t) => t.id !== id);
  writeJSON(LS_KEYS.TICKETS, next);
  return { ok: true };
}

/********************************************************
 * DOM refs / runtime state
 ********************************************************/
let currentUser = null;
let currentTickets = [];
let editingTicketId = null;
let deleteTargetId = null;

// page sections
const pages = {
  landing: document.getElementById("page-landing"),
  login: document.getElementById("page-login"),
  signup: document.getElementById("page-signup"),
  dashboard: document.getElementById("page-dashboard"),
  tickets: document.getElementById("page-tickets"),
};

// navbar area
const navAuthState = document.getElementById("nav-auth-state");

// dashboard refs
const dashErr = document.getElementById("dashboard-load-error");
const dashStats = document.getElementById("dashboard-stats");

// tickets page refs
const ticketsErrorWrap = document.getElementById("tickets-error");
const ticketsErrorText = document.getElementById("tickets-error-text");
const ticketsRetryBtn = document.getElementById("tickets-retry");
const ticketsEmpty = document.getElementById("tickets-empty");
const ticketsList = document.getElementById("tickets-list");

const newTicketBtn = document.getElementById("btn-new-ticket");
const formWrapper = document.getElementById("ticket-form-wrapper");
const formEl = document.getElementById("ticket-form");
const ticketIdInput = document.getElementById("ticket-id");
const titleInput = document.getElementById("ticket-title");
const descInput = document.getElementById("ticket-description");
const statusSelect = document.getElementById("ticket-status");

const titleErr = document.getElementById("ticket-title-error");
const descErr = document.getElementById("ticket-desc-error");
const statusErr = document.getElementById("ticket-status-error");

const topFormError = document.getElementById("ticket-form-top-error");
const submitBtn = document.getElementById("ticket-submit");
const cancelBtn = document.getElementById("ticket-cancel");
const ticketFormTitle = document.getElementById("ticket-form-title");
const ticketFormDesc = document.getElementById("ticket-form-desc");

// login/signup refs
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginTopError = document.getElementById("login-top-error");
const loginEmailErr = document.getElementById("login-email-error");
const loginPwdErr = document.getElementById("login-password-error");

const signupForm = document.getElementById("signup-form");
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupTopError = document.getElementById("signup-top-error");
const signupEmailErr = document.getElementById("signup-email-error");
const signupPwdErr = document.getElementById("signup-password-error");

// delete modal refs
const modalOverlay = document.getElementById("delete-modal-overlay");
const modalPanel = document.getElementById("delete-modal-panel");
const deleteName = document.getElementById("delete-ticket-name");
const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
const deleteCancelBtn = document.getElementById("delete-cancel-btn");

/********************************************************
 * Navbar render
 ********************************************************/
function renderNavbar() {
  if (!navAuthState) return;
  navAuthState.innerHTML = "";

  if (currentUser) {
    navAuthState.innerHTML = `
      <a href="#/dashboard" class="text-text-dim hover:text-text">Dashboard</a>
      <a href="#/tickets" class="text-text-dim hover:text-text">Tickets</a>
      <span class="hidden sm:inline text-text-dim">${currentUser.email}</span>
      <button id="logout-btn"
        class="rounded-pill bg-white px-3 py-1 text-xs font-medium text-text border border-surface-border hover:bg-surface-subtle">
        Logout
      </button>
    `;

    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn.addEventListener("click", () => {
      logout();
      currentUser = null;
      toastPolite("Signed out.");
      window.location.hash = "/"; // go home
      syncStateFromStorageAndRoute();
    });
  } else {
    navAuthState.innerHTML = `
      <a href="#/login" class="text-text-dim hover:text-text">Login</a>
      <a href="#/signup"
        class="rounded-pill bg-brand-600 px-4 py-2 text-white text-xs font-medium hover:bg-brand-700">
        Get Started
      </a>
    `;
  }
}

/********************************************************
 * Page helpers
 ********************************************************/
function showPage(which) {
  Object.keys(pages).forEach((key) => {
    if (!pages[key]) return;
    pages[key].classList.toggle("hidden", key !== which);
  });
}

// Tickets list render
function renderTicketsList() {
  ticketsErrorWrap.classList.add("hidden");
  ticketsEmpty.classList.add("hidden");
  ticketsList.innerHTML = "";

  if (!currentTickets || currentTickets.length === 0) {
    ticketsEmpty.classList.remove("hidden");
    return;
  }

  currentTickets.forEach((t) => {
    const created = t.createdAt
      ? new Date(t.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "–";

    const badgeClass =
      t.status === "open"
        ? "badge badge-open"
        : t.status === "in_progress"
        ? "badge badge-in_progress"
        : "badge badge-closed";

    const card = document.createElement("article");
    card.className = "ticket-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Ticket: ${t.title}`);

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-text break-words">${t.title || "Untitled ticket"}</h2>
          <p class="text-[12px] leading-[16px] text-text-dim">Created ${created}</p>
        </div>
        <span class="${badgeClass}">${t.status}</span>
      </div>

      <p class="text-sm text-text-dim max-h-[3.75rem] overflow-hidden text-ellipsis break-words">
        ${t.description || "No description provided."}
      </p>

      <div class="flex flex-wrap gap-3">
        <button
          class="rounded-pill border border-surface-border bg-white px-3 py-1.5 text-[13px] leading-[16px] font-medium text-text hover:bg-surface-subtle"
          data-action="view"
          data-id="${t.id}"
          aria-label="View ticket ${t.title}"
          title="View"
        >
          View
        </button>

        <button
          class="rounded-pill bg-brand-600 px-3 py-1.5 text-[13px] leading-[16px] font-medium text-white hover:bg-brand-700"
          data-action="edit"
          data-id="${t.id}"
          aria-label="Edit ticket ${t.title}"
          title="Edit"
        >
          Edit
        </button>

        <button
          class="rounded-pill bg-red-700 px-3 py-1.5 text-[13px] leading-[16px] font-medium text-white hover:bg-red-800"
          data-action="delete"
          data-id="${t.id}"
          aria-label="Delete ticket ${t.title}"
          title="Delete"
        >
          Delete
        </button>
      </div>
    `;

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const ticketObj = currentTickets.find((x) => x.id === id);
      if (!ticketObj) return;

      if (action === "edit" || action === "view") {
        openFormForEdit(ticketObj, action === "view");
      } else if (action === "delete") {
        openDeleteModal(ticketObj);
      }
    });

    ticketsList.appendChild(card);
  });
}

// Dashboard stats
function renderDashboardStats() {
  dashStats.innerHTML = "";

  let open = 0,
    inProg = 0,
    closed = 0;
  for (const t of currentTickets) {
    if (t.status === "open") open++;
    else if (t.status === "in_progress") inProg++;
    else if (t.status === "closed") closed++;
  }
  const total = currentTickets.length;

  const statCard = (label, value, hint) => `
    <div class="card p-4">
      <p class="text-sm text-text-dim">${label}</p>
      <p class="text-2xl font-semibold text-text">${value}</p>
      <p class="text-[12px] leading-[16px] text-text-dim">${hint}</p>
    </div>
  `;

  dashStats.insertAdjacentHTML(
    "beforeend",
    statCard("Open", open, "Needs attention")
  );
  dashStats.insertAdjacentHTML(
    "beforeend",
    statCard("In Progress", inProg, "Being worked on")
  );
  dashStats.insertAdjacentHTML(
    "beforeend",
    statCard("Closed", closed, "Resolved")
  );
  dashStats.insertAdjacentHTML(
    "beforeend",
    statCard("Total", total, "All tickets")
  );
}

/********************************************************
 * Ticket Form logic
 ********************************************************/
function clearTicketFormErrors() {
  titleErr.textContent = "";
  descErr.textContent = "";
  statusErr.textContent = "";
  topFormError.classList.add("hidden");
  topFormError.textContent = "";
}

function fillTicketFormForCreate() {
  editingTicketId = null;
  ticketIdInput.value = "";
  titleInput.value = "";
  descInput.value = "";
  statusSelect.value = "open";
  ticketFormTitle.textContent = "New ticket";
  ticketFormDesc.textContent = "Describe the issue so it can be resolved.";
  submitBtn.textContent = "Create ticket";
  submitBtn.disabled = false;
}

function fillTicketFormForEdit(ticket, readOnly = false) {
  editingTicketId = ticket.id;
  ticketIdInput.value = ticket.id;
  titleInput.value = ticket.title || "";
  descInput.value = ticket.description || "";
  statusSelect.value = ticket.status || "open";

  ticketFormTitle.textContent = readOnly ? "View ticket" : "Edit ticket";
  ticketFormDesc.textContent = readOnly
    ? "Ticket details (read-only)."
    : "Update the details and status.";

  submitBtn.textContent = readOnly ? "Close" : "Save changes";
  submitBtn.disabled = !!readOnly;
}

function openFormForCreate() {
  clearTicketFormErrors();
  fillTicketFormForCreate();
  formWrapper.classList.remove("hidden");
  titleInput.focus();
}

function openFormForEdit(ticket, readOnly = false) {
  clearTicketFormErrors();
  fillTicketFormForEdit(ticket, readOnly);
  formWrapper.classList.remove("hidden");
  if (!readOnly) titleInput.focus();
}

function closeForm() {
  formWrapper.classList.add("hidden");
  editingTicketId = null;
}

// submit create/edit
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTicketFormErrors();

  const titleVal = titleInput.value.trim();
  const descVal = descInput.value.trim();
  const statusVal = statusSelect.value;

  if (!titleVal) {
    titleErr.textContent = "Title is required.";
    return;
  }
  if (!ALLOWED_STATUS.includes(statusVal)) {
    statusErr.textContent =
      "Status must be open, in_progress, or closed.";
    return;
  }
  if (descVal.length > 500) {
    descErr.textContent = "Max 500 characters allowed.";
    return;
  }

  if (editingTicketId) {
    const updated = updateTicket({
      id: editingTicketId,
      title: titleVal,
      description: descVal,
      status: statusVal,
    });
    if (!updated.ok) {
      showTicketServerErrors(updated.error);
      return;
    }
    toastPolite("Ticket updated.");
  } else {
    const created = createTicket({
      title: titleVal,
      description: descVal,
      status: statusVal,
    });
    if (!created.ok) {
      showTicketServerErrors(created.error);
      return;
    }
    toastPolite("Ticket created.");
  }

  // refresh dashboard + list
  const res = fetchTickets();
  if (res.ok) {
    currentTickets = res.tickets;
  }
  renderTicketsList();
  renderDashboardStats();

  closeForm();
});

cancelBtn.addEventListener("click", () => {
  closeForm();
});

function showTicketServerErrors(err) {
  if (err?.message) {
    topFormError.classList.remove("hidden");
    topFormError.textContent = err.message;
  }
  if (err?.details?.fields) {
    if (err.details.fields.title) {
      titleErr.textContent = err.details.fields.title;
    }
    if (err.details.fields.description) {
      descErr.textContent = err.details.fields.description;
    }
    if (err.details.fields.status) {
      statusErr.textContent = err.details.fields.status;
    }
  }
}

/********************************************************
 * Delete Modal Logic
 ********************************************************/
function openDeleteModal(ticket) {
  deleteTargetId = ticket.id;
  deleteName.textContent = `“${ticket.title}” will be permanently removed.`;
  modalOverlay.classList.remove("hidden");
  deleteConfirmBtn.focus();
}

function closeDeleteModal() {
  modalOverlay.classList.add("hidden");
  deleteTargetId = null;
}

deleteCancelBtn.addEventListener("click", () => {
  closeDeleteModal();
});

deleteConfirmBtn.addEventListener("click", () => {
  if (!deleteTargetId) return;

  // optimistic update
  const previous = [...currentTickets];
  currentTickets = previous.filter((t) => t.id !== deleteTargetId);
  renderTicketsList();
  renderDashboardStats();
  closeDeleteModal();

  const result = deleteTicket(deleteTargetId);
  if (!result.ok) {
    // rollback
    currentTickets = previous;
    renderTicketsList();
    renderDashboardStats();
    toastAssertive(MSG_DELETE_ERROR);
  } else {
    toastPolite("Ticket deleted.");
  }
});

// focus trap + ESC handling
document.addEventListener("keydown", (e) => {
  if (modalOverlay.classList.contains("hidden")) return;
  if (e.key === "Escape") {
    e.stopPropagation();
    closeDeleteModal();
  }
});

document.addEventListener("focusin", (e) => {
  if (modalOverlay.classList.contains("hidden")) return;
  if (!modalPanel.contains(e.target)) {
    deleteConfirmBtn.focus();
  }
});

/********************************************************
 * Login / Signup handlers
 ********************************************************/
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginEmailErr.textContent = "";
  loginPwdErr.textContent = "";
  loginTopError.classList.add("hidden");
  loginTopError.textContent = "";

  const emailVal = loginEmail.value.trim();
  const pwdVal = loginPassword.value;

  if (!emailVal) loginEmailErr.textContent = "Email is required.";
  if (!pwdVal) loginPwdErr.textContent = "Password is required.";
  if (!emailVal || !pwdVal) return;

  const result = login({ email: emailVal, password: pwdVal });
  if (!result.ok) {
    loginTopError.classList.remove("hidden");
    loginTopError.textContent = result.error.message || "Login failed.";

    if (result.error.details?.fields?.email) {
      loginEmailErr.textContent = result.error.details.fields.email;
    }
    if (result.error.details?.fields?.password) {
      loginPwdErr.textContent = result.error.details.fields.password;
    }
    return;
  }

  currentUser = result.user;
  toastPolite("Logged in successfully.");
  window.location.hash = "/dashboard";
  syncStateFromStorageAndRoute();
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signupEmailErr.textContent = "";
  signupPwdErr.textContent = "";
  signupTopError.classList.add("hidden");
  signupTopError.textContent = "";

  const emailVal = signupEmail.value.trim();
  const pwdVal = signupPassword.value;

  if (!emailVal) signupEmailErr.textContent = "Email is required.";
  else if (!emailVal.includes("@"))
    signupEmailErr.textContent = "Enter a valid email.";

  if (!pwdVal) signupPwdErr.textContent = "Password is required.";
  else if (pwdVal.length < 6)
    signupPwdErr.textContent = "Minimum 6 characters.";

  if (signupEmailErr.textContent || signupPwdErr.textContent) return;

  const result = signup({ email: emailVal, password: pwdVal });
  if (!result.ok) {
    signupTopError.classList.remove("hidden");
    signupTopError.textContent =
      result.error.message || "Signup failed.";

    if (result.error.details?.fields?.email) {
      signupEmailErr.textContent =
        result.error.details.fields.email;
    }
    if (result.error.details?.fields?.password) {
      signupPwdErr.textContent =
        result.error.details.fields.password;
    }
    return;
  }

  currentUser = result.user;
  toastPolite("Account created.");
  window.location.hash = "/dashboard";
  syncStateFromStorageAndRoute();
});

/********************************************************
 * Ticket loading helpers
 ********************************************************/
function loadTicketsAndRenderForTicketsPage() {
  const result = fetchTickets();
  if (!result.ok) {
    ticketsErrorWrap.classList.remove("hidden");
    ticketsErrorText.textContent = MSG_LOAD_ERROR;
    ticketsEmpty.classList.add("hidden");
    ticketsList.innerHTML = "";
    return;
  }

  currentTickets = result.tickets;
  renderTicketsList();
}

function loadTicketsAndRenderForDashboard() {
  const result = fetchTickets();
  if (!result.ok) {
    dashErr.classList.remove("hidden");
    dashErr.textContent = MSG_LOAD_ERROR;
    toastAssertive(MSG_LOAD_ERROR);
    return;
  }
  dashErr.classList.add("hidden");
  dashErr.textContent = "";

  currentTickets = result.tickets;
  renderDashboardStats();
}

// retry button on tickets page
ticketsRetryBtn.addEventListener("click", () => {
  loadTicketsAndRenderForTicketsPage();
});

/********************************************************
 * New ticket button
 ********************************************************/
newTicketBtn.addEventListener("click", () => {
  openFormForCreate();
});

cancelBtn.addEventListener("click", () => {
  closeForm();
});

/********************************************************
 * Router
 ********************************************************/
function routeGuarded(p) {
  if (p === "dashboard" || p === "tickets") {
    if (!currentUser) {
      toastAssertive(MSG_SESSION_EXPIRED);
      return "login";
    }
  }
  return p;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  const path = hash.split("?")[0].replace(/^\//, "");
  if (!path) return "landing";
  if (path === "login") return "login";
  if (path === "signup") return "signup";
  if (path === "dashboard") return "dashboard";
  if (path === "tickets") return "tickets";
  return "landing";
}

function syncStateFromStorage() {
  const s = getSession();
  currentUser = s ? { email: s.email } : null;
  renderNavbar();

  const fy = document.getElementById("footer-year");
  if (fy) fy.textContent = new Date().getFullYear();
}

function syncStateFromStorageAndRoute() {
  syncStateFromStorage();

  closeForm();
  closeDeleteModal();

  let p = parseRoute();
  p = routeGuarded(p);
  showPage(p);

  if (p === "dashboard") {
    loadTicketsAndRenderForDashboard();
  } else if (p === "tickets") {
    loadTicketsAndRenderForTicketsPage();
  }
}

window.addEventListener("hashchange", syncStateFromStorageAndRoute);

/********************************************************
 * Init
 ********************************************************/
syncStateFromStorageAndRoute();
