// ============================================
// State
// ============================================
const state = {
  currentCategory: "accommodation",
  currentView: "grid",
  links: [],
  searchTerm: "",
};

const categories = {
  accommodation: {
    title: "Accommodation Links",
    description: "Manage and track accommodation-related links for hospitals and research institutes",
  },
  yojna: {
    title: "Yojna Links",
    description: "Manage and track government yojna/scheme-related links",
  },
  faculty: {
    title: "Faculty Page Links",
    description: "Manage and track faculty page links of hospitals and research institutes",
  },
};

// ============================================
// DOM References
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  // Nav
  navBtns: $$(".nav-btn"),
  tabTitle: $("#tab-title"),
  tabDesc: $("#tab-description"),
  countAccommodation: $("#count-accommodation"),
  countYojna: $("#count-yojna"),
  countFaculty: $("#count-faculty"),
  totalCount: $("#total-count"),

  // Links
  linksContainer: $("#links-container"),
  linksCount: $("#links-count"),

  // Search
  searchInput: $("#search-input"),
  searchClear: $("#search-clear"),

  // Form
  addForm: $("#add-form"),
  addToggle: $("#add-toggle"),
  cancelAdd: $("#cancel-add"),
  linkTitle: $("#link-title"),
  linkUrl: $("#link-url"),
  linkDesc: $("#link-desc"),
  linkSubmitter: $("#link-submitter"),

  // View
  viewBtns: $$(".view-btn"),

  // Edit Modal
  editModal: $("#edit-modal"),
  editForm: $("#edit-form"),
  editId: $("#edit-id"),
  editTitle: $("#edit-title"),
  editUrl: $("#edit-url"),
  editDesc: $("#edit-desc"),
  editSubmitter: $("#edit-submitter"),
  modalClose: $("#modal-close"),
  cancelEdit: $("#cancel-edit"),

  // Delete Modal
  deleteModal: $("#delete-modal"),
  deleteId: $("#delete-id"),
  confirmDelete: $("#confirm-delete"),
  cancelDelete: $("#cancel-delete"),
  deleteClose: $("#delete-close"),

  // Export
  exportBtn: $("#export-csv"),

  // Toast
  toastContainer: $("#toast-container"),

  // Landing
  landingOverlay: $("#landing-overlay"),
  landingForm: $("#landing-form"),
  landingName: $("#landing-name"),
  landingBtn: $("#landing-btn"),

  // User
  userBadge: $("#user-badge"),
  userAvatar: $("#user-avatar"),
  userNameDisplay: $("#user-name-display"),
  switchUserBtn: $("#switch-user-btn"),

  // Login Log
  viewLogBtn: $("#view-log-btn"),
  logModal: $("#log-modal"),
  logModalClose: $("#log-modal-close"),
  logTbody: $("#log-tbody"),
  logSummary: $("#log-summary"),
};

// ============================================
// API
// ============================================
const API = {
  async getLinks(category, search = "") {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/links/${category}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch links");
    return res.json();
  },

  async addLink(data) {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 409) {
      const err = await res.json();
      throw new Error(err.error);
    }
    if (!res.ok) throw new Error("Failed to add link");
    return res.json();
  },

  async deleteLink(id) {
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete link");
    return res.json();
  },

  async updateLink(id, data) {
    const res = await fetch(`/api/links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update link");
    return res.json();
  },

  async getStats() {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  async logLogin(name, action = "login") {
    await fetch("/api/login-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, action }),
    });
  },

  async getLoginLog() {
    const res = await fetch("/api/login-log");
    if (!res.ok) throw new Error("Failed to fetch login log");
    return res.json();
  },

  async getLoginLogStats() {
    const res = await fetch("/api/login-log/stats");
    if (!res.ok) throw new Error("Failed to fetch login stats");
    return res.json();
  },
};

// ============================================
// Toast
// ============================================
function showToast(message, type = "success") {
  const icons = { success: "fa-check-circle", error: "fa-exclamation-circle", warning: "fa-exclamation-triangle" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${message}`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// Render Links
// ============================================
function renderLinks() {
  const links = state.links;
  const container = dom.linksContainer;

  if (links.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No links found</h3>
        <p>${state.searchTerm ? "Try a different search term." : "Add your first link to get started!"}</p>
      </div>`;
    dom.linksCount.textContent = "0";
    return;
  }

  dom.linksCount.textContent = links.length;

  container.innerHTML = links
    .map(
      (link) => `
    <div class="link-card" data-id="${link.id}">
      <div class="card-top">
        <div class="card-title">${escapeHtml(link.title)}</div>
        <div class="card-actions">
          <button class="action-btn edit-btn" onclick="openEditModal(${link.id})" title="Edit">
            <i class="fas fa-pen"></i>
          </button>
          <button class="action-btn delete-btn" onclick="openDeleteModal(${link.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="card-url">
        <i class="fas fa-external-link-alt"></i>
        ${escapeHtml(truncateUrl(link.url))}
      </a>
      ${link.description ? `<div class="card-description">${escapeHtml(link.description)}</div>` : ""}
      <div class="card-footer">
        <div class="card-submitter">
          <i class="fas fa-user"></i>
          ${link.submitted_by ? escapeHtml(link.submitted_by) : "Anonymous"}
        </div>
        <div class="card-date">
          <i class="far fa-clock"></i> ${formatDate(link.created_at)}
        </div>
      </div>
    </div>`
    )
    .join("");
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 30 ? u.pathname.substring(0, 30) + "..." : u.pathname);
  } catch {
    return url.length > 50 ? url.substring(0, 50) + "..." : url;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Load Links
// ============================================
async function loadLinks() {
  try {
    const links = await API.getLinks(state.currentCategory, state.searchTerm);
    state.links = links;
    renderLinks();
    loadStats();
  } catch (err) {
    showToast("Failed to load links: " + err.message, "error");
  }
}

async function loadStats() {
  try {
    const stats = await API.getStats();
    dom.countAccommodation.textContent = stats.accommodation || 0;
    dom.countYojna.textContent = stats.yojna || 0;
    dom.countFaculty.textContent = stats.faculty || 0;
    const total = (stats.accommodation || 0) + (stats.yojna || 0) + (stats.faculty || 0);
    dom.totalCount.textContent = total;
  } catch {
    // silent fail for stats
  }
}

// ============================================
// Tab Navigation
// ============================================
function switchCategory(category) {
  state.currentCategory = category;
  state.searchTerm = "";
  dom.searchInput.value = "";
  dom.searchClear.classList.remove("visible");

  // Update nav
  dom.navBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === category);
  });

  // Update header
  dom.tabTitle.textContent = categories[category].title;
  dom.tabDesc.textContent = categories[category].description;

  // Close form
  closeAddForm();

  loadLinks();
}

dom.navBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchCategory(btn.dataset.tab));
});

// ============================================
// Add Form
// ============================================
function openAddForm() {
  dom.addToggle.classList.add("open");
  dom.addForm.classList.add("open");
  dom.linkTitle.focus();
}

function closeAddForm() {
  dom.addToggle.classList.remove("open");
  dom.addForm.classList.remove("open");
  dom.addForm.reset();
}

dom.addToggle.addEventListener("click", () => {
  if (dom.addForm.classList.contains("open")) {
    closeAddForm();
  } else {
    openAddForm();
  }
});

dom.cancelAdd.addEventListener("click", closeAddForm);

dom.addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    category: state.currentCategory,
    title: dom.linkTitle.value.trim(),
    url: dom.linkUrl.value.trim(),
    description: dom.linkDesc.value.trim(),
    submitted_by: dom.linkSubmitter.value.trim(),
  };

  try {
    await API.addLink(data);
    showToast("Link added successfully!", "success");
    closeAddForm();
    loadLinks();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ============================================
// Search
// ============================================
let searchTimeout = null;
dom.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchTerm = dom.searchInput.value.trim();
    dom.searchClear.classList.toggle("visible", state.searchTerm.length > 0);
    loadLinks();
  }, 300);
});

dom.searchClear.addEventListener("click", () => {
  dom.searchInput.value = "";
  state.searchTerm = "";
  dom.searchClear.classList.remove("visible");
  loadLinks();
});

// ============================================
// View Toggle
// ============================================
dom.viewBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    dom.viewBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentView = btn.dataset.view;
    dom.linksContainer.classList.toggle("list-view", state.currentView === "list");
  });
});

// ============================================
// Edit Modal
// ============================================
function openEditModal(id) {
  const link = state.links.find((l) => l.id === id);
  if (!link) return;
  dom.editId.value = link.id;
  dom.editTitle.value = link.title;
  dom.editUrl.value = link.url;
  dom.editDesc.value = link.description || "";
  dom.editSubmitter.value = link.submitted_by || "";
  dom.editModal.classList.add("open");
}

function closeEditModal() {
  dom.editModal.classList.remove("open");
}

dom.modalClose.addEventListener("click", closeEditModal);
dom.cancelEdit.addEventListener("click", closeEditModal);
dom.editModal.addEventListener("click", (e) => {
  if (e.target === dom.editModal) closeEditModal();
});

dom.editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = dom.editId.value;
  const data = {
    title: dom.editTitle.value.trim(),
    url: dom.editUrl.value.trim(),
    description: dom.editDesc.value.trim(),
    submitted_by: dom.editSubmitter.value.trim(),
  };
  try {
    await API.updateLink(id, data);
    showToast("Link updated successfully!", "success");
    closeEditModal();
    loadLinks();
  } catch (err) {
    showToast("Failed to update link: " + err.message, "error");
  }
});

// ============================================
// Delete Modal
// ============================================
function openDeleteModal(id) {
  dom.deleteId.value = id;
  dom.deleteModal.classList.add("open");
}

function closeDeleteModal() {
  dom.deleteModal.classList.remove("open");
}

dom.confirmDelete.addEventListener("click", async () => {
  const id = dom.deleteId.value;
  try {
    await API.deleteLink(id);
    showToast("Link deleted successfully!", "success");
    closeDeleteModal();
    loadLinks();
  } catch (err) {
    showToast("Failed to delete link: " + err.message, "error");
  }
});

dom.cancelDelete.addEventListener("click", closeDeleteModal);
dom.deleteClose.addEventListener("click", closeDeleteModal);
dom.deleteModal.addEventListener("click", (e) => {
  if (e.target === dom.deleteModal) closeDeleteModal();
});

// ============================================
// Keyboard Shortcuts
// ============================================
document.addEventListener("keydown", (e) => {
  // Escape
  if (e.key === "Escape") {
    closeEditModal();
    closeDeleteModal();
    closeAddForm();
    closeLogModal();
  }
  // Ctrl+K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    dom.searchInput.focus();
  }
});

// ============================================
// Export CSV
// ============================================
dom.exportBtn.addEventListener("click", () => {
  window.open(`/api/export/${state.currentCategory}`, "_blank");
});

// ============================================
// Name Gate
// ============================================
function getUserName() {
  return localStorage.getItem("trackerUserName") || "";
}

function setUserName(name) {
  localStorage.setItem("trackerUserName", name.trim());
}

function showLanding() {
  dom.landingOverlay.classList.remove("hidden");
  dom.landingName.value = "";
  dom.landingName.focus();
}

function hideLanding() {
  dom.landingOverlay.classList.add("hidden");
}

function updateUserBadge(name) {
  const initial = name.charAt(0).toUpperCase();
  dom.userAvatar.textContent = initial;
  dom.userNameDisplay.textContent = name;
}

function authenticateUser(name) {
  setUserName(name);
  updateUserBadge(name);
  // Also set the submitter name field
  dom.linkSubmitter.value = name;
  localStorage.setItem("submitterName", name);
  hideLanding();
  // Log this login event
  API.logLogin(name, "login").catch(() => {});
  // Data will be loaded by init() -> switchCategory() after this
}

function signOut() {
  const name = getUserName();
  localStorage.removeItem("trackerUserName");
  localStorage.removeItem("submitterName");
  // Log this logout event
  if (name) {
    API.logLogin(name, "logout").catch(() => {});
  }
  showLanding();
}

dom.landingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = dom.landingName.value.trim();
  if (!name) return;

  authenticateUser(name);
});

// Enter key on landing page already handled by form submit

dom.switchUserBtn.addEventListener("click", signOut);

// ============================================
// Login Log Viewer
// ============================================
function formatLogTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today at ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ` at ${time}`;
  } catch {
    return dateStr;
  }
}

function closeLogModal() {
  dom.logModal.classList.remove("open");
}

async function openLogModal() {
  dom.logModal.classList.add("open");
  dom.logTbody.innerHTML = '<tr><td colspan="3" class="log-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
  dom.logSummary.innerHTML = "";

  try {
    const [logs, stats] = await Promise.all([
      API.getLoginLog(),
      API.getLoginLogStats(),
    ]);

    // Render summary
    if (stats.length > 0) {
      dom.logSummary.innerHTML = stats
        .map(
          (s) => `
        <div class="log-summary-item">
          <i class="fas fa-user"></i>
          <span><span class="log-summary-count">${s.count}</span> login${s.count > 1 ? "s" : ""} today — ${escapeHtml(s.name)}</span>
        </div>`
        )
        .join("");
    }

    // Render table
    if (logs.length === 0) {
      dom.logTbody.innerHTML = '<tr><td colspan="3" class="log-empty">No login activity recorded yet</td></tr>';
      return;
    }

    dom.logTbody.innerHTML = logs
      .map(
        (log) => `
      <tr>
        <td>
          <div class="log-name">
            <div class="log-avatar">${escapeHtml(log.name.charAt(0).toUpperCase())}</div>
            ${escapeHtml(log.name)}
          </div>
        </td>
        <td>
          <span class="log-action ${log.action}">
            <i class="fas fa-${log.action === "login" ? "sign-in-alt" : "sign-out-alt"}"></i>
            ${log.action === "login" ? "Login" : "Logout"}
          </span>
        </td>
        <td class="log-time">${formatLogTime(log.created_at)}</td>
      </tr>`
      )
      .join("");
  } catch {
    dom.logTbody.innerHTML = '<tr><td colspan="3" class="log-loading" style="color:var(--danger)">Failed to load login log</td></tr>';
  }
}

dom.viewLogBtn.addEventListener("click", openLogModal);
dom.logModalClose.addEventListener("click", closeLogModal);
dom.logModal.addEventListener("click", (e) => {
  if (e.target === dom.logModal) closeLogModal();
});

// ============================================
// Init
// ============================================
async function init() {
  // Check if user has already entered their name
  const userName = getUserName();
  if (userName) {
    updateUserBadge(userName);
    dom.linkSubmitter.value = userName;
    hideLanding();
  } else {
    showLanding();
  }

  // Load initial data
  switchCategory("accommodation");

  // Save submitter name
  dom.linkSubmitter.addEventListener("change", () => {
    if (dom.linkSubmitter.value.trim()) {
      localStorage.setItem("submitterName", dom.linkSubmitter.value.trim());
    }
  });
}

init();
