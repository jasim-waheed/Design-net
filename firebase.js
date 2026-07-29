// ============================================================
// FREE DATABASE SETTINGS (Firebase) — makes Projects & Messages
// visible to EVERY visitor, on EVERY device, permanently.
// Same config as the original Next.js project — untouched.
//
// IMPORTANT: Firebase is loaded lazily (dynamic import, wrapped in
// try/catch) instead of a top-level static import. A static import
// of a remote URL that fails (blocked network, ad-blocker, firewall,
// offline) would otherwise crash this ENTIRE module — and every file
// that imports it (main.js, admin.js) — breaking the whole site/admin
// panel. With a lazy dynamic import, a network failure just falls
// back to local-storage-only mode instead of breaking anything.
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAo7nHdKjgdxYJSO-z3hj-P9iumZMQIC9o",
  authDomain: "designnet-101b5.firebaseapp.com",
  projectId: "designnet-101b5",
  storageBucket: "designnet-101b5.firebasestorage.app",
  messagingSenderId: "283633302101",
  appId: "1:283633302101:web:824f29acdcab62438472dc",
};

// Whether Firebase is *configured* (not necessarily reachable — that's
// checked lazily below).
export const firebaseEnabled = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

let db = null;
let initPromise = null;

// Lazily initializes Firebase the first time it's actually needed.
// Never throws — resolves to `null` on any failure so callers can
// fall back to localStorage.
async function ensureDb() {
  if (!firebaseEnabled) return null;
  if (db) return db;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const [{ initializeApp, getApps }, firestoreMod] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
        ]);
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        db = firestoreMod.getFirestore(app);
        db._mod = firestoreMod; // stash module ref for helper functions below
        return db;
      } catch (e) {
        console.warn("[DesignNest] Firebase unavailable — falling back to local storage only.", e);
        return null;
      }
    })();
  }
  return initPromise;
}

// ---------------- PROJECTS ----------------

export function subscribeToProjects(callback) {
  let unsub = () => {};
  let cancelled = false;
  ensureDb().then((database) => {
    if (cancelled) return;
    if (!database) return; // caller's localStorage fallback handles this case
    const { collection, onSnapshot, query, orderBy } = database._mod;
    const q = query(collection(database, "projects"), orderBy("createdAt", "desc"));
    unsub = onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => callback([])
    );
  });
  return () => {
    cancelled = true;
    unsub();
  };
}

export async function addProjectToDB(project) {
  const database = await ensureDb();
  if (!database) return null;
  const { collection, addDoc, serverTimestamp } = database._mod;
  return addDoc(collection(database, "projects"), { ...project, createdAt: serverTimestamp() });
}

export async function deleteProjectFromDB(id) {
  const database = await ensureDb();
  if (!database) return;
  const { doc, deleteDoc } = database._mod;
  await deleteDoc(doc(database, "projects", id));
}

// ---------------- MESSAGES ----------------

export function subscribeToMessages(callback) {
  let unsub = () => {};
  let cancelled = false;
  ensureDb().then((database) => {
    if (cancelled) return;
    if (!database) return;
    const { collection, onSnapshot, query, orderBy } = database._mod;
    const q = query(collection(database, "messages"), orderBy("createdAt", "desc"));
    unsub = onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => callback([])
    );
  });
  return () => {
    cancelled = true;
    unsub();
  };
}

export async function addMessageToDB(msg) {
  const database = await ensureDb();
  if (!database) return null;
  const { collection, addDoc, serverTimestamp } = database._mod;
  return addDoc(collection(database, "messages"), {
    name: msg.name,
    contact: msg.contact || "",
    message: msg.message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markAllMessagesReadDB(messages) {
  const database = await ensureDb();
  if (!database) return;
  const unread = messages.filter((m) => !m.read);
  if (unread.length === 0) return;
  const { doc, writeBatch } = database._mod;
  const batch = writeBatch(database);
  unread.forEach((m) => batch.update(doc(database, "messages", m.id), { read: true }));
  await batch.commit();
}

export async function clearAllMessagesDB(messages) {
  const database = await ensureDb();
  if (!database) return;
  if (messages.length === 0) return;
  const { doc, writeBatch } = database._mod;
  const batch = writeBatch(database);
  messages.forEach((m) => batch.delete(doc(database, "messages", m.id)));
  await batch.commit();
}
