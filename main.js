import { portfolio, socials } from "./data.js";
import { sendEmailNotification } from "./emailConfig.js";
import { firebaseEnabled, subscribeToProjects, addMessageToDB } from "./firebase.js";

const categories = ["All", "Graphic Design", "Full Stack"];
const socialIconMap = {
  whatsapp: "message-circle",
  instagram: "instagram",
  facebook: "facebook",
  linkedin: "linkedin",
  tiktok: "message-circle",
  threads: "message-circle",
};

/* ---------------- Mobile menu ---------------- */
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const iconOpen = document.getElementById("menuIconOpen");
const iconClose = document.getElementById("menuIconClose");

function setMenu(open) {
  mobileMenu.classList.toggle("hidden", !open);
  mobileMenu.classList.toggle("flex", open);
  iconOpen.classList.toggle("hidden", open);
  iconClose.classList.toggle("hidden", !open);
}
menuBtn.addEventListener("click", () => {
  const isHidden = mobileMenu.classList.contains("hidden");
  setMenu(isHidden);
});
mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* ---------------- Socials ---------------- */
const socialLinks = document.getElementById("socialLinks");
socialLinks.innerHTML = socials
  .map(
    (s) => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer" title="${s.name}"
       class="w-12 h-12 rounded-full bg-white border border-black/10 flex items-center justify-center hover:gradient-btn hover:text-white text-ink/60 transition-colors">
      <i data-lucide="${socialIconMap[s.key] || "message-circle"}" class="w-[18px] h-[18px]"></i>
    </a>`
  )
  .join("");

/* ---------------- Portfolio (with custom / Firebase / localStorage projects) ---------------- */
const CUSTOM_KEY = "designnest_custom_projects";
let active = "All";
let customProjects = [];

function getCustomProjects() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

const categoryButtons = document.getElementById("categoryButtons");
const portfolioGrid = document.getElementById("portfolioGrid");

function renderCategoryButtons() {
  categoryButtons.innerHTML = categories
    .map(
      (c) => `
      <button data-cat="${c}" class="px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
        active === c ? "gradient-btn text-white" : "bg-white border border-black/10 text-ink/60 hover:text-ink"
      }">${c}</button>`
    )
    .join("");
  categoryButtons.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      active = btn.dataset.cat;
      renderCategoryButtons();
      renderPortfolioGrid();
    });
  });
}

function mockCardHTML(item) {
  return `
    <div class="rounded-2xl overflow-hidden border border-black/5 bg-white group">
      <div class="aspect-video relative flex flex-col" style="background: linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]});">
        <div class="flex items-center gap-1.5 px-4 pt-4">
          <span class="w-2.5 h-2.5 rounded-full bg-white/50"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-white/50"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-white/50"></span>
        </div>
        <div class="flex-1 flex items-center justify-center">
          <i data-lucide="code-2" class="w-10 h-10 text-white/80"></i>
        </div>
      </div>
      <div class="p-5">
        <span class="text-xs font-semibold text-indigo">${item.tag}</span>
        <h3 class="font-display font-bold mt-1">${item.title}</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          ${item.stack.map((s) => `<span class="text-xs bg-cloud px-2.5 py-1 rounded-full text-ink/60">${s}</span>`).join("")}
        </div>
      </div>
    </div>`;
}

function imageCardHTML(item) {
  return `
    <div class="rounded-2xl overflow-hidden border border-black/5 bg-white group">
      <div class="aspect-video relative overflow-hidden">
        <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div class="p-5">
        <span class="text-xs font-semibold text-coral">${item.tag}</span>
        <h3 class="font-display font-bold mt-1">${item.title}</h3>
      </div>
    </div>`;
}

function renderPortfolioGrid() {
  const allProjects = [...customProjects, ...portfolio];
  const filtered = active === "All" ? allProjects : allProjects.filter((p) => p.category === active);
  portfolioGrid.innerHTML = filtered
    .map((item) => (item.type === "image" ? imageCardHTML(item) : mockCardHTML(item)))
    .join("");
  if (window.lucide) window.lucide.createIcons();
}

// Always show this browser's local projects immediately (works even if
// Firebase is unreachable). If Firebase is configured and reachable, its
// live data will replace this as soon as it responds.
customProjects = getCustomProjects();
window.addEventListener("storage", (e) => {
  if (e.key === CUSTOM_KEY) {
    customProjects = getCustomProjects();
    renderPortfolioGrid();
  }
});

if (firebaseEnabled) {
  subscribeToProjects((fresh) => {
    customProjects = fresh;
    renderPortfolioGrid();
  });
}

renderCategoryButtons();
renderPortfolioGrid();

/* ---------------- Contact form ---------------- */
const MESSAGES_KEY = "designnest_messages";

function saveMessageLocally(msg) {
  try {
    const existing = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
    existing.unshift({ ...msg, date: new Date().toISOString(), read: false });
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("designnest_new_message"));
    return true;
  } catch (e) {
    return false;
  }
}

const contactForm = document.getElementById("contactForm");
const sentMsg = document.getElementById("sentMsg");

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("cName").value.trim();
  const contact = document.getElementById("cContact").value.trim();
  const message = document.getElementById("cMessage").value.trim();
  if (!name || !message) return;

  const form = { name, contact, message };

  // Always save locally first so the message is never lost even if
  // Firebase is unreachable; if Firebase is configured, also send it there.
  saveMessageLocally(form);
  if (firebaseEnabled) {
    addMessageToDB(form);
  }
  sendEmailNotification(form); // forwards to your Gmail once configured in js/emailConfig.js

  sentMsg.classList.remove("hidden");
  contactForm.reset();
  setTimeout(() => sentMsg.classList.add("hidden"), 4000);
});

/* ---------------- Footer year ---------------- */
document.getElementById("footerYear").textContent = `© ${new Date().getFullYear()} DesignNest. All rights reserved.`;

/* ---------------- Icons ---------------- */
if (window.lucide) window.lucide.createIcons();
