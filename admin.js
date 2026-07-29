import {
  firebaseEnabled,
  subscribeToProjects,
  subscribeToMessages,
  addProjectToDB,
  deleteProjectFromDB,
  markAllMessagesReadDB,
  clearAllMessagesDB,
} from "./firebase.js";

const ADMIN_PASSWORD = "@Jasimkhan5917";
const MESSAGES_KEY = "designnest_messages";
const PROJECTS_KEY = "designnest_custom_projects";

let messages = [];
let projects = [];
let tab = "messages";
let notifPermission = typeof Notification !== "undefined" ? Notification.permission : "default";
let messageCount = 0;
let firstLoad = true;

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
function getProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    /* ignore */
  }
}

function icons() {
  if (window.lucide) window.lucide.createIcons();
}

/* ---------------- Elements ---------------- */
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const cloudStatus = document.getElementById("cloudStatus");
const cloudNotice = document.getElementById("cloudNotice");
const cloudSyncNote = document.getElementById("cloudSyncNote");
const notifBtn = document.getElementById("notifBtn");
const logoutBtn = document.getElementById("logoutBtn");

const tabMessagesBtn = document.getElementById("tabMessages");
const tabProjectsBtn = document.getElementById("tabProjects");
const messagesTab = document.getElementById("messagesTab");
const projectsTab = document.getElementById("projectsTab");
const unreadBadge = document.getElementById("unreadBadge");

const messageCountEl = document.getElementById("messageCount");
const markAllReadBtn = document.getElementById("markAllReadBtn");
const clearMessagesBtn = document.getElementById("clearMessagesBtn");
const messagesList = document.getElementById("messagesList");

const addProjectForm = document.getElementById("addProjectForm");
const pTitle = document.getElementById("pTitle");
const pCategory = document.getElementById("pCategory");
const pTag = document.getElementById("pTag");
const pImage = document.getElementById("pImage");
const pImagePreview = document.getElementById("pImagePreview");
const projectCount = document.getElementById("projectCount");
const projectsList = document.getElementById("projectsList");

let pendingImage = "";
let unsubMessages = null;
let unsubProjects = null;

/* ---------------- Render ---------------- */
function renderCloudStatus() {
  cloudStatus.innerHTML = firebaseEnabled
    ? `<i data-lucide="cloud" class="w-[14px] h-[14px]"></i> Cloud sync on`
    : `<i data-lucide="cloud-off" class="w-[14px] h-[14px]"></i> Cloud sync off`;
  cloudStatus.className = `hidden sm:flex items-center gap-1.5 text-xs font-medium ${firebaseEnabled ? "text-cyan" : "text-ink/40"}`;
  cloudNotice.classList.toggle("hidden", firebaseEnabled);
  cloudSyncNote.textContent = firebaseEnabled
    ? "Cloud sync is on — messages from every visitor, on every device, appear here live. "
    : "Note: messages are stored in this browser only (frontend-only storage). ";
  icons();
}

function renderNotifBtn() {
  notifBtn.innerHTML =
    notifPermission === "granted"
      ? `<i data-lucide="bell-ring" class="w-4 h-4"></i> Notifications on`
      : `<i data-lucide="bell" class="w-4 h-4"></i> Enable notifications`;
  notifBtn.className = `text-sm font-medium flex items-center gap-1.5 ${
    notifPermission === "granted" ? "text-cyan" : "text-ink/60 hover:text-ink"
  }`;
  icons();
}

function renderTabs() {
  tabMessagesBtn.className = `px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${
    tab === "messages" ? "gradient-btn text-white" : "bg-white border border-black/10 text-ink/60"
  }`;
  tabProjectsBtn.className = `px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${
    tab === "projects" ? "gradient-btn text-white" : "bg-white border border-black/10 text-ink/60"
  }`;
  messagesTab.classList.toggle("hidden", tab !== "messages");
  projectsTab.classList.toggle("hidden", tab !== "projects");
}

function renderMessages() {
  const unreadCount = messages.filter((m) => !m.read).length;
  messageCountEl.textContent = `(${messages.length})`;
  unreadBadge.classList.toggle("hidden", unreadCount === 0);
  unreadBadge.textContent = unreadCount || "";
  markAllReadBtn.classList.toggle("hidden", unreadCount === 0);
  clearMessagesBtn.classList.toggle("hidden", messages.length === 0);

  if (messages.length === 0) {
    messagesList.innerHTML = `<div class="bg-white rounded-2xl border border-black/5 p-10 text-center text-ink/50">No messages yet. New contact form submissions will appear here.</div>`;
  } else {
    messagesList.innerHTML = `<div class="space-y-4">${messages
      .map((m, i) => {
        const dateStr = m.date
          ? new Date(m.date).toLocaleString()
          : m.createdAt && m.createdAt.toDate
          ? m.createdAt.toDate().toLocaleString()
          : "";
        return `
        <div class="bg-white rounded-2xl border p-5 ${m.read ? "border-black/5" : "border-indigo/40 shadow-sm"}">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2 text-sm font-semibold">
              <i data-lucide="user" class="w-[15px] h-[15px] text-indigo"></i> ${m.name}
              ${!m.read ? `<span class="text-[10px] uppercase tracking-wide bg-indigo/10 text-indigo px-2 py-0.5 rounded-full">New</span>` : ""}
            </div>
            <div class="flex items-center gap-1.5 text-xs text-ink/40">
              <i data-lucide="clock" class="w-[13px] h-[13px]"></i> ${dateStr}
            </div>
          </div>
          ${
            m.contact
              ? `<div class="flex items-center gap-2 text-sm text-ink/60 mt-2"><i data-lucide="mail" class="w-[14px] h-[14px]"></i> ${m.contact}</div>`
              : ""
          }
          <p class="text-sm text-ink/70 mt-3 leading-relaxed">${m.message}</p>
        </div>`;
      })
      .join("")}</div>`;
  }
  icons();
}

function renderProjects() {
  projectCount.textContent = `(${projects.length})`;
  if (projects.length === 0) {
    projectsList.innerHTML = `<div class="bg-white rounded-2xl border border-black/5 p-10 text-center text-ink/50">No custom projects added yet. Projects you add above will show up instantly in the Portfolio section on the live website${
      firebaseEnabled ? " for every visitor" : ""
    }.</div>`;
  } else {
    projectsList.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">${projects
      .map(
        (p) => `
      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="aspect-video relative"><img src="${p.image}" alt="${p.title}" class="w-full h-full object-cover" /></div>
        <div class="p-4">
          <span class="text-xs font-semibold text-coral">${p.tag}</span>
          <h3 class="font-display font-bold text-sm mt-1">${p.title}</h3>
          <p class="text-xs text-ink/50 mt-1">${p.category}</p>
          <button data-id="${p.id}" class="delete-project-btn mt-3 text-xs text-coral font-medium flex items-center gap-1.5">
            <i data-lucide="trash-2" class="w-[13px] h-[13px]"></i> Remove
          </button>
        </div>
      </div>`
      )
      .join("")}</div>`;
    projectsList.querySelectorAll(".delete-project-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteProject(btn.dataset.id));
    });
  }
  icons();
}

/* ---------------- Auth ---------------- */
function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  renderCloudStatus();
  renderNotifBtn();
  renderTabs();
  startSync();
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (passwordInput.value === ADMIN_PASSWORD) {
    loginError.classList.add("hidden");
    sessionStorage.setItem("designnest_admin_authed", "true");
    messages = getMessages();
    projects = getProjects();
    showDashboard();
  } else {
    loginError.classList.remove("hidden");
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("designnest_admin_authed");
  if (unsubMessages) unsubMessages();
  if (unsubProjects) unsubProjects();
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  passwordInput.value = "";
});

if (sessionStorage.getItem("designnest_admin_authed") === "true") {
  messages = getMessages();
  projects = getProjects();
  showDashboard();
}

/* ---------------- Sync (localStorage baseline + Firebase live overlay) ---------------- */
// This always runs the localStorage-based sync so the dashboard works
// even if Firebase is unreachable (blocked network, offline, etc). If
// Firebase is configured AND reachable, its live data additionally
// overrides/replaces what's shown, in real time, across every device.
let pollInterval = null;
function startSync() {
  messageCount = getMessages().length;
  renderMessages();
  renderProjects();

  const refresh = () => {
    const fresh = getMessages();
    if (fresh.length > messageCount) {
      playBeep();
      notifyNewMessage(fresh[0]);
    }
    messageCount = fresh.length;
    messages = fresh;
    renderMessages();
  };
  window.addEventListener("storage", (e) => {
    if (e.key === MESSAGES_KEY) refresh();
    if (e.key === PROJECTS_KEY) {
      projects = getProjects();
      renderProjects();
    }
  });
  window.addEventListener("designnest_new_message", refresh);
  pollInterval = setInterval(refresh, 4000);

  if (firebaseEnabled) {
    firstLoad = true;
    unsubMessages = subscribeToMessages((fresh) => {
      if (!firstLoad && fresh.length > messageCount) {
        playBeep();
        notifyNewMessage(fresh[0]);
      }
      messageCount = fresh.length;
      firstLoad = false;
      messages = fresh;
      renderMessages();
    });
    unsubProjects = subscribeToProjects((fresh) => {
      projects = fresh;
      renderProjects();
    });
  }
}

function notifyNewMessage(latest) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("New DesignNest message", {
      body: `${latest.name}: ${latest.message.slice(0, 80)}`,
    });
  }
}

notifBtn.addEventListener("click", async () => {
  if (typeof Notification === "undefined") return;
  notifPermission = await Notification.requestPermission();
  renderNotifBtn();
});

/* ---------------- Tabs ---------------- */
tabMessagesBtn.addEventListener("click", () => {
  tab = "messages";
  renderTabs();
});
tabProjectsBtn.addEventListener("click", () => {
  tab = "projects";
  renderTabs();
});

/* ---------------- Messages actions ---------------- */
clearMessagesBtn.addEventListener("click", async () => {
  localStorage.removeItem(MESSAGES_KEY);
  messages = [];
  renderMessages();
  if (firebaseEnabled) {
    clearAllMessagesDB(messages);
  }
});

markAllReadBtn.addEventListener("click", async () => {
  messages = messages.map((m) => ({ ...m, read: true }));
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  renderMessages();
  if (firebaseEnabled) {
    markAllMessagesReadDB(messages);
  }
});

/* ---------------- Projects actions ---------------- */
pImage.addEventListener("change", () => {
  const file = pImage.files && pImage.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = reader.result;
    pImagePreview.src = pendingImage;
    pImagePreview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

addProjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = pTitle.value.trim();
  if (!title || !pendingImage) return;
  const newProject = {
    title,
    category: pCategory.value,
    tag: pTag.value,
    image: pendingImage,
    type: "image",
  };

  const withId = { ...newProject, id: `custom-${Date.now()}` };
  projects = [withId, ...projects];
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  renderProjects();
  if (firebaseEnabled) {
    addProjectToDB(newProject);
  }

  pTitle.value = "";
  pCategory.value = "Graphic Design";
  pTag.value = "Company";
  pendingImage = "";
  pImage.value = "";
  pImagePreview.classList.add("hidden");
});

async function deleteProject(id) {
  projects = projects.filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  renderProjects();
  if (firebaseEnabled) {
    deleteProjectFromDB(id);
  }
}

icons();
