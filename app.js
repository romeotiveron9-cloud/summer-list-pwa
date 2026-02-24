"use strict";

/* -------------------------------------------------------
  Summer List — app.js (v8)
  - Storage: IndexedDB con fallback localStorage
  - i18n, tema, font size, PIN hash, categorie private
  - Export/Import JSON, Reset demo
  - ✅ Dashboard filter: Tot / Fatte / In sospeso
  - ✅ Confirm interno (NO confirm() del browser)
------------------------------------------------------- */

const STORAGE_KEY = "summer_list_topplus_v2"; // bump versione

const PRIORITY_LABEL = {
  high: { it: "Alta", en: "High" },
  med: { it: "Media", en: "Med" },
  low: { it: "Bassa", en: "Low" },
};

const I18N = {
  it: {
    home: "Home",
    categories: "Categorie",
    category: "Categoria",
    data: "Dati",
    settings: "Impostazioni",
    edit: "Modifica",
    total: "Tot",
    done: "Fatte",
    open: "In sospeso",
    tipHome: "Tocca una categoria per aprirla. Le categorie private richiedono PIN.",
    tipCat: "Spunta le attività completate. Puoi modificare con ✎ o eliminare con 🗑.",
    newCategory: "Nuova categoria",
    renameCategory: "Modifica categoria",
    catName: "Nome categoria",
    catType: "Tipo",
    normal: "Normale",
    private: "Privata",
    catColor: "Colore",
    catHint: "Le categorie private si aprono solo con PIN.",
    cancel: "Annulla",
    save: "Salva",
    newTask: "Nuova attività",
    editTask: "Modifica attività",
    text: "Testo",
    priority: "Priorità",
    notes: "Note (opzionale)",
    export: "Export",
    import: "Import",
    reset: "Reset demo",
    close: "Chiudi",
    genJson: "Genera JSON",
    copyJson: "Copia JSON",
    applyImport: "Importa",
    pasteHere: "Incolla qui il JSON da importare...",
    unlockTitle: "Categoria privata",
    unlockHint: "Inserisci il PIN dell’app per sbloccare.",
    unlock: "Sblocca",
    pinTitle: "PIN app (categorie private)",
    pinHint: "Il PIN viene salvato in modo hashato sul dispositivo.",
    savePin: "Salva PIN",
    lang: "Lingua",
    theme: "Tema",
    light: "Chiaro",
    dark: "Scuro",
    fontSize: "Dimensione font",
    setPinFirst: "Prima imposta un PIN nelle Impostazioni per creare categorie private.",
    wrongPin: "PIN errato.",
    importConfirm: "Importare questi dati? Sovrascriverà quelli attuali.",
    resetConfirm: "Reset demo? Cancella tutto e rimette i dati di esempio.",
    pinSaved: "PIN salvato.",
    copied: "Copiato!",
    selectedNowCopy: "Selezionato: ora fai Copia.",
    invalidJson: "JSON non valido.",
    dupCategory: "Esiste già una categoria con questo nome.",

    confirmDeleteCategoryTitle: "Elimina categoria",
    confirmDeleteTaskTitle: "Elimina attività",
    confirmImportTitle: "Importa dati",
    confirmResetTitle: "Reset demo",
    ok: "Ok",
    delete: "Elimina",
  },
  en: {
    home: "Home",
    categories: "Categories",
    category: "Category",
    data: "Data",
    settings: "Settings",
    edit: "Edit",
    total: "Total",
    done: "Done",
    open: "Open",
    tipHome: "Tap a category to open it. Private categories require a PIN.",
    tipCat: "Tick completed tasks. You can edit with ✎ or delete with 🗑.",
    newCategory: "New category",
    renameCategory: "Edit category",
    catName: "Category name",
    catType: "Type",
    normal: "Normal",
    private: "Private",
    catColor: "Color",
    catHint: "Private categories open only with a PIN.",
    cancel: "Cancel",
    save: "Save",
    newTask: "New task",
    editTask: "Edit task",
    text: "Text",
    priority: "Priority",
    notes: "Notes (optional)",
    export: "Export",
    import: "Import",
    reset: "Reset demo",
    close: "Close",
    genJson: "Generate JSON",
    copyJson: "Copy JSON",
    applyImport: "Import",
    pasteHere: "Paste JSON to import...",
    unlockTitle: "Private category",
    unlockHint: "Enter app PIN to unlock.",
    unlock: "Unlock",
    pinTitle: "App PIN (private categories)",
    pinHint: "Your PIN is stored hashed on-device.",
    savePin: "Save PIN",
    lang: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    fontSize: "Font size",
    setPinFirst: "Set an app PIN in Settings before creating private categories.",
    wrongPin: "Wrong PIN.",
    importConfirm: "Import these data? This will overwrite current data.",
    resetConfirm: "Reset demo? This will delete everything and restore sample data.",
    pinSaved: "PIN saved.",
    copied: "Copied!",
    selectedNowCopy: "Selected: now copy.",
    invalidJson: "Invalid JSON.",
    dupCategory: "A category with this name already exists.",

    confirmDeleteCategoryTitle: "Delete category",
    confirmDeleteTaskTitle: "Delete task",
    confirmImportTitle: "Import data",
    confirmResetTitle: "Reset demo",
    ok: "Ok",
    delete: "Delete",
  },
};

/* -------------------------------------------------------
   STORAGE: IndexedDB + fallback localStorage
------------------------------------------------------- */
const Storage = (() => {
  const DB_NAME = "SummerListDB";
  const DB_VER = 1;
  const STORE = "kv";

  const hasIDB = () => typeof indexedDB !== "undefined";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const st = tx.objectStore(STORE);
      const req = st.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function idbSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      const req = st.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function idbDel(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      const req = st.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  function lsGet(key) {
    try { return localStorage.getItem(key) ?? null; } catch { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }

  return {
    async getString(key) {
      if (hasIDB()) { try { return await idbGet(key); } catch {} }
      return lsGet(key);
    },
    async setString(key, value) {
      if (hasIDB()) { try { await idbSet(key, value); return true; } catch {} }
      return lsSet(key, value);
    },
    async del(key) {
      if (hasIDB()) { try { await idbDel(key); return true; } catch {} }
      return lsDel(key);
    },
  };
})();

/* -------------------------------------------------------
   APP STATE
------------------------------------------------------- */
let state = freshState();
let activeCategoryId = null;
const unlocked = new Set(); // sblocco solo sessione

let editingCategoryId = null;
let editingTaskId = null;
let pendingOpenCategoryId = null;

// ✅ filtro dashboard home
let homeFilter = "all"; // "all" | "done" | "open"

/* -------------------------------------------------------
   DOM
------------------------------------------------------- */
const el = {
  screenHome: document.getElementById("screenHome"),
  screenCategory: document.getElementById("screenCategory"),

  btnBack: document.getElementById("btnBack"),
  btnData: document.getElementById("btnData"),
  btnAddTop: document.getElementById("btnAddTop"),
  btnMenu: document.getElementById("btnMenu"),
  topSmall: document.getElementById("topSmall"),
  topBig: document.getElementById("topBig"),

  dashTotal: document.getElementById("dashTotal"),
  dashDone: document.getElementById("dashDone"),
  dashOpen: document.getElementById("dashOpen"),
  lblTotal: document.getElementById("lblTotal"),
  lblDone: document.getElementById("lblDone"),
  lblOpen: document.getElementById("lblOpen"),

  dashCardTotal: document.getElementById("dashCardTotal"),
  dashCardDone: document.getElementById("dashCardDone"),
  dashCardOpen: document.getElementById("dashCardOpen"),

  homeSectionTitle: document.getElementById("homeSectionTitle"),
  homeTip: document.getElementById("homeTip"),
  catTip: document.getElementById("catTip"),

  categoryList: document.getElementById("categoryList"),
  taskList: document.getElementById("taskList"),
  categoryTitle: document.getElementById("categoryTitle"),
  categorySub: document.getElementById("categorySub"),

  btnEditCategory: document.getElementById("btnEditCategory"),
  lblEditCategory: document.getElementById("lblEditCategory"),

  categoryModal: document.getElementById("categoryModal"),
  categoryModalTitle: document.getElementById("categoryModalTitle"),
  categoryInput: document.getElementById("categoryInput"),
  categoryColor: document.getElementById("categoryColor"),
  closeCategoryModal: document.getElementById("closeCategoryModal"),
  cancelCategoryModal: document.getElementById("cancelCategoryModal"),
  saveCategoryModal: document.getElementById("saveCategoryModal"),

  unlockModal: document.getElementById("unlockModal"),
  unlockTitle: document.getElementById("unlockTitle"),
  unlockHint: document.getElementById("unlockHint"),
  unlockPin: document.getElementById("unlockPin"),
  closeUnlockModal: document.getElementById("closeUnlockModal"),
  cancelUnlock: document.getElementById("cancelUnlock"),
  confirmUnlock: document.getElementById("confirmUnlock"),

  taskModal: document.getElementById("taskModal"),
  taskModalTitle: document.getElementById("taskModalTitle"),
  taskText: document.getElementById("taskText"),
  taskPriority: document.getElementById("taskPriority"),
  taskNotes: document.getElementById("taskNotes"),
  closeTaskModal: document.getElementById("closeTaskModal"),
  cancelTaskModal: document.getElementById("cancelTaskModal"),
  saveTaskModal: document.getElementById("saveTaskModal"),

  dataSheet: document.getElementById("dataSheet"),
  btnCloseData: document.getElementById("btnCloseData"),
  btnGenerateExport: document.getElementById("btnGenerateExport"),
  exportArea: document.getElementById("exportArea"),
  btnCopyExport: document.getElementById("btnCopyExport"),
  importArea: document.getElementById("importArea"),
  btnApplyImport: document.getElementById("btnApplyImport"),
  btnReset: document.getElementById("btnReset"),

  settingsSheet: document.getElementById("settingsSheet"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  langSelect: document.getElementById("langSelect"),
  btnThemeLight: document.getElementById("btnThemeLight"),
  btnThemeDark: document.getElementById("btnThemeDark"),
  fontRange: document.getElementById("fontRange"),
  pinInput: document.getElementById("pinInput"),
  btnSavePin: document.getElementById("btnSavePin"),

  settingsTitle: document.getElementById("settingsTitle"),
  langTitle: document.getElementById("langTitle"),
  themeTitle: document.getElementById("themeTitle"),
  fontTitle: document.getElementById("fontTitle"),
  pinTitle: document.getElementById("pinTitle"),
  pinHint: document.getElementById("pinHint"),
  lblLight: document.getElementById("lblLight"),
  lblDark: document.getElementById("lblDark"),

  dataTitle: document.getElementById("dataTitle"),
  exportTitle: document.getElementById("exportTitle"),
  importTitle: document.getElementById("importTitle"),
  resetTitle: document.getElementById("resetTitle"),

  lblCatName: document.getElementById("lblCatName"),
  lblCatType: document.getElementById("lblCatType"),
  lblNormal: document.getElementById("lblNormal"),
  lblPrivate: document.getElementById("lblPrivate"),
  lblCatColor: document.getElementById("lblCatColor"),
  catHint: document.getElementById("catHint"),

  lblTaskText: document.getElementById("lblTaskText"),
  lblPriority: document.getElementById("lblPriority"),
  lblNotes: document.getElementById("lblNotes"),
  priHigh: document.getElementById("priHigh"),
  priMed: document.getElementById("priMed"),
  priLow: document.getElementById("priLow"),

  // ✅ confirm modal
  confirmModal: document.getElementById("confirmModal"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmText: document.getElementById("confirmText"),
  closeConfirmModal: document.getElementById("closeConfirmModal"),
  confirmCancel: document.getElementById("confirmCancel"),
  confirmOk: document.getElementById("confirmOk"),
};

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */
(async function init() {
  state = await loadState();
  ensureDemoIfEmpty();

  state.settings = state.settings || {};
  state.settings.lang = state.settings.lang || "it";
  state.settings.theme = state.settings.theme || "light";
  state.settings.font =
    typeof state.settings.font === "number" ? state.settings.font : 1.02;

  activeCategoryId =
    state.ui?.activeCategoryId || state.categories[0]?.id || null;

  await saveState();

  applyThemeAndFont();
  applyI18n();
  wireEvents();
  goHome();
})();

/* -------------------------------------------------------
   EVENTS
------------------------------------------------------- */
function wireEvents() {
  el.btnBack.addEventListener("click", goHome);

  el.btnData.addEventListener("click", () => {
    el.exportArea.value = "";
    el.importArea.value = "";
    safeShowModal(el.dataSheet);
  });
  el.btnCloseData.addEventListener("click", () => safeClose(el.dataSheet));

  el.btnMenu.addEventListener("click", () => {
    el.langSelect.value = state.settings.lang;
    el.fontRange.value = Math.round(state.settings.font * 100);
    el.pinInput.value = "";
    safeShowModal(el.settingsSheet);
  });
  el.btnCloseSettings.addEventListener("click", () => safeClose(el.settingsSheet));

  el.btnAddTop.addEventListener("click", () => {
    if (!el.screenHome.hidden) openCategoryModal({ mode: "create" });
    else openTaskModal({ mode: "create" });
  });

  el.btnEditCategory.addEventListener("click", () => {
    const cat = getActiveCategory();
    if (!cat) return;
    openCategoryModal({ mode: "edit", category: cat });
  });

  // Dashboard filter
  el.dashCardTotal?.addEventListener("click", () => setHomeFilter("all"));
  el.dashCardDone?.addEventListener("click", () => setHomeFilter("done"));
  el.dashCardOpen?.addEventListener("click", () => setHomeFilter("open"));

  // Category modal
  el.closeCategoryModal.addEventListener("click", () => safeClose(el.categoryModal));
  el.cancelCategoryModal.addEventListener("click", () => safeClose(el.categoryModal));
  el.saveCategoryModal.addEventListener("click", saveCategoryFromModal);
  el.categoryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCategoryFromModal();
    }
  });

  // Task modal
  el.closeTaskModal.addEventListener("click", () => safeClose(el.taskModal));
  el.cancelTaskModal.addEventListener("click", () => safeClose(el.taskModal));
  el.saveTaskModal.addEventListener("click", saveTaskFromModal);
  el.taskText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTaskFromModal();
    }
  });

  // Unlock modal
  el.closeUnlockModal.addEventListener("click", () => safeClose(el.unlockModal));
  el.cancelUnlock.addEventListener("click", () => safeClose(el.unlockModal));
  el.confirmUnlock.addEventListener("click", confirmUnlock);
  el.unlockPin.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmUnlock();
    }
  });

  // ✅ Confirm modal (internal)
  el.closeConfirmModal.addEventListener("click", () => resolveConfirm(false));
  el.confirmCancel.addEventListener("click", () => resolveConfirm(false));
  el.confirmOk.addEventListener("click", () => resolveConfirm(true));

  // Data
  el.btnGenerateExport.addEventListener("click", generateExport);
  el.btnCopyExport.addEventListener("click", copyExport);
  el.btnApplyImport.addEventListener("click", applyImport);
  el.btnReset.addEventListener("click", resetDemo);

  // Settings: language
  el.langSelect.addEventListener("change", async () => {
    state.settings.lang = el.langSelect.value === "en" ? "en" : "it";
    await saveState();
    applyI18n();
    renderDashboard();
    if (!el.screenHome.hidden) renderCategories();
    if (!el.screenCategory.hidden) renderTasks();
  });

  // Settings: theme
  el.btnThemeLight.addEventListener("click", () => setTheme("light"));
  el.btnThemeDark.addEventListener("click", () => setTheme("dark"));

  // Settings: font size
  el.fontRange.addEventListener("input", async () => {
    state.settings.font = clamp(el.fontRange.value / 100, 0.92, 1.25);
    await saveState();
    applyThemeAndFont();
  });

  // Settings: PIN
  el.btnSavePin.addEventListener("click", async () => {
    const raw = (el.pinInput.value || "").trim();
    if (!raw) return;
    state.settings.pinHash = await sha256(raw);
    await saveState();
    el.pinInput.value = "";
    alert(t("pinSaved"));
  });

  // Backdrop close
  addBackdropClose(el.dataSheet);
  addBackdropClose(el.settingsSheet);
  addBackdropClose(el.categoryModal);
  addBackdropClose(el.taskModal);
  addBackdropClose(el.unlockModal);
  addBackdropClose(el.confirmModal);
}

function setHomeFilter(next) {
  homeFilter = next;
  renderDashboard();
  renderCategories();
}

/* -------------------------------------------------------
   NAV
------------------------------------------------------- */
function goHome() {
  el.screenHome.hidden = false;
  el.screenCategory.hidden = true;
  el.btnBack.hidden = true;

  el.topSmall.textContent = t("home");
  el.topBig.textContent = t("categories");

  renderDashboard();
  renderCategories();
}

async function tryOpenCategory(catId) {
  const cat = state.categories.find((c) => c.id === catId);
  if (!cat) return;

  if (cat.isPrivate) {
    if (!state.settings.pinHash) {
      alert(t("setPinFirst"));
      safeShowModal(el.settingsSheet);
      return;
    }
    if (unlocked.has(catId)) {
      openCategory(catId);
      return;
    }
    pendingOpenCategoryId = catId;
    el.unlockTitle.textContent = t("unlockTitle");
    el.unlockHint.textContent = t("unlockHint");
    el.unlockPin.value = "";
    safeShowModal(el.unlockModal);
    setTimeout(() => el.unlockPin.focus(), 80);
    return;
  }

  openCategory(catId);
}

async function openCategory(catId) {
  activeCategoryId = catId;
  await saveState();

  const cat = getActiveCategory();
  el.screenHome.hidden = true;
  el.screenCategory.hidden = false;
  el.btnBack.hidden = false;

  el.topSmall.textContent = t("category");
  el.topBig.textContent = cat ? cat.name : "—";
  el.categoryTitle.textContent = cat ? cat.name : "—";

  const stats = categoryStats(catId);
  const unit = state.settings.lang === "it" ? "attività" : "tasks";
  const doneLabel = state.settings.lang === "it" ? "fatte" : "done";
  el.categorySub.textContent = `${stats.total} ${unit} · ${stats.done} ${doneLabel}`;

  renderTasks();
}

async function confirmUnlock() {
  const pin = (el.unlockPin.value || "").trim();
  if (!pin) return;

  const hash = await sha256(pin);
  if (hash !== state.settings.pinHash) {
    alert(t("wrongPin"));
    return;
  }

  const toOpen = pendingOpenCategoryId;
  pendingOpenCategoryId = null;
  unlocked.add(toOpen);

  safeClose(el.unlockModal);
  await openCategory(toOpen);
}

/* -------------------------------------------------------
   RENDER
------------------------------------------------------- */
function renderDashboard() {
  const total = state.tasks.length;
  const done = state.tasks.filter((x) => x.done).length;
  const open = total - done;

  el.dashTotal.textContent = String(total);
  el.dashDone.textContent = String(done);
  el.dashOpen.textContent = String(open);

  el.lblTotal.textContent = t("total");
  el.lblDone.textContent = t("done");
  el.lblOpen.textContent = t("open");

  el.dashCardTotal?.classList.toggle("is-active", homeFilter === "all");
  el.dashCardDone?.classList.toggle("is-active", homeFilter === "done");
  el.dashCardOpen?.classList.toggle("is-active", homeFilter === "open");
}

function renderCategories() {
  el.homeSectionTitle.textContent = t("categories");
  el.homeTip.textContent = t("tipHome");
  el.categoryList.innerHTML = "";

  const categoriesToShow = state.categories.filter((c) => {
    const stats = categoryStats(c.id);

    if (homeFilter === "all") return true;

    // done = categoria completa (almeno 1 task e tutte done)
    if (homeFilter === "done") return stats.total > 0 && stats.done === stats.total;

    // open = categoria non completa (incluse 0 task)
    if (homeFilter === "open") return stats.total === 0 || stats.done < stats.total;

    return true;
  });

  categoriesToShow.forEach((c) => {
    const stats = categoryStats(c.id);

    const li = document.createElement("li");
    li.className = `card card--tap ${colorClass(c.color)}`;

    const left = document.createElement("div");
    left.className = "left";

    const title = document.createElement("div");
    title.className = "title";
    title.innerHTML = `${c.isPrivate ? `<span class="lock">🔒</span>` : ""}<span>${escapeHtml(c.name)}</span>`;

    const meta = document.createElement("div");
    meta.className = "meta";
    const unit = state.settings.lang === "it" ? "attività" : "tasks";
    const doneLabel = state.settings.lang === "it" ? "fatte" : "done";
    meta.innerHTML = `<span>${stats.total} ${unit}</span><span class="pill">${stats.done} ${doneLabel}</span>`;

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "mini";
    editBtn.type = "button";
    editBtn.title = t("edit");
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryModal({ mode: "edit", category: c });
    });

    const delBtn = document.createElement("button");
    delBtn.className = "mini mini--danger";
    delBtn.type = "button";
    delBtn.title = "Delete";
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteCategory(c.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);

    li.addEventListener("click", () => tryOpenCategory(c.id));
    el.categoryList.appendChild(li);
  });
}

function renderTasks() {
  el.catTip.textContent = t("tipCat");
  el.lblEditCategory.textContent = t("edit");

  el.taskList.innerHTML = "";
  const cat = getActiveCategory();
  if (!cat) return;

  const tasks = state.tasks
    .filter((x) => x.categoryId === cat.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  tasks.forEach((tItem) => {
    const li = document.createElement("li");
    li.className = "task";

    const checkWrap = document.createElement("div");
    checkWrap.className = "task__check";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!tItem.done;
    cb.addEventListener("change", async () => {
      tItem.done = cb.checked;
      await saveState();
      renderDashboard();
      updateCategorySub(cat.id);
      renderTasks();
    });
    checkWrap.appendChild(cb);

    const main = document.createElement("div");
    main.className = "task__main";

    const row = document.createElement("div");
    row.className = "task__row";

    const text = document.createElement("div");
    text.className = "task__text" + (tItem.done ? " done" : "");
    text.textContent = tItem.text;

    const badge = document.createElement("span");
    badge.className = `badge ${tItem.priority}`;
    badge.textContent = PRIORITY_LABEL[tItem.priority][state.settings.lang];

    row.appendChild(text);
    row.appendChild(badge);

    const notes = document.createElement("div");
    notes.className = "task__notes";
    notes.textContent = (tItem.notes || "").trim() ? tItem.notes : "—";

    main.appendChild(row);
    main.appendChild(notes);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "mini";
    editBtn.type = "button";
    editBtn.title = t("edit");
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", () =>
      openTaskModal({ mode: "edit", task: tItem })
    );

    const delBtn = document.createElement("button");
    delBtn.className = "mini mini--danger";
    delBtn.type = "button";
    delBtn.title = "Delete";
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", async () => {
      await deleteTask(tItem.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(checkWrap);
    li.appendChild(main);
    li.appendChild(actions);

    el.taskList.appendChild(li);
  });
}

function updateCategorySub(catId) {
  const stats = categoryStats(catId);
  const unit = state.settings.lang === "it" ? "attività" : "tasks";
  const doneLabel = state.settings.lang === "it" ? "fatte" : "done";
  el.categorySub.textContent = `${stats.total} ${unit} · ${stats.done} ${doneLabel}`;
}

/* -------------------------------------------------------
   MODALS
------------------------------------------------------- */
function openCategoryModal({ mode, category }) {
  editingCategoryId = null;

  if (mode === "edit") {
    editingCategoryId = category.id;
    el.categoryModalTitle.textContent = t("renameCategory");
    el.categoryInput.value = category.name;
    el.categoryColor.value = category.color || "aqua";
    setCatTypeRadio(category.isPrivate ? "private" : "normal");
  } else {
    el.categoryModalTitle.textContent = t("newCategory");
    el.categoryInput.value = "";
    el.categoryColor.value = "aqua";
    setCatTypeRadio("normal");
  }

  safeShowModal(el.categoryModal);
  setTimeout(() => el.categoryInput.focus(), 70);
}

function setCatTypeRadio(value) {
  document
    .querySelectorAll('input[name="catType"]')
    .forEach((r) => (r.checked = r.value === value));
}

function getCatTypeRadio() {
  const selected = document.querySelector('input[name="catType"]:checked');
  return selected ? selected.value : "normal";
}

async function saveCategoryFromModal() {
  const name = (el.categoryInput.value || "").trim();
  if (!name) {
    el.categoryInput.focus();
    return;
  }

  const color = el.categoryColor.value || "aqua";
  const wantPrivate = getCatTypeRadio() === "private";

  if (wantPrivate && !state.settings.pinHash) {
    alert(t("setPinFirst"));
    safeClose(el.categoryModal);
    safeShowModal(el.settingsSheet);
    return;
  }

  const dup = state.categories.some(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId
  );
  if (dup) {
    alert(t("dupCategory"));
    return;
  }

  if (editingCategoryId) {
    const c = state.categories.find((x) => x.id === editingCategoryId);
    if (c) {
      c.name = name;
      c.color = color;
      c.isPrivate = wantPrivate;
      if (wantPrivate) unlocked.delete(c.id);
    }
  } else {
    state.categories.push({ id: uid(), name, color, isPrivate: wantPrivate });
  }

  await saveState();
  safeClose(el.categoryModal);

  renderDashboard();

  if (!el.screenHome.hidden) renderCategories();
  if (!el.screenCategory.hidden) {
    const cat = getActiveCategory();
    el.topBig.textContent = cat ? cat.name : "—";
    el.categoryTitle.textContent = cat ? cat.name : "—";
    updateCategorySub(activeCategoryId);
  }
}

function openTaskModal({ mode, task }) {
  const cat = getActiveCategory();
  if (!cat) return;

  editingTaskId = null;

  if (mode === "edit") {
    editingTaskId = task.id;
    el.taskModalTitle.textContent = t("editTask");
    el.taskText.value = task.text || "";
    el.taskPriority.value = task.priority || "med";
    el.taskNotes.value = task.notes || "";
  } else {
    el.taskModalTitle.textContent = t("newTask");
    el.taskText.value = "";
    el.taskPriority.value = "med";
    el.taskNotes.value = "";
  }

  safeShowModal(el.taskModal);
  setTimeout(() => el.taskText.focus(), 70);
}

async function saveTaskFromModal() {
  const cat = getActiveCategory();
  if (!cat) return;

  const text = (el.taskText.value || "").trim();
  if (!text) {
    el.taskText.focus();
    return;
  }

  const priority = el.taskPriority.value || "med";
  const notes = el.taskNotes.value || "";

  if (editingTaskId) {
    const tItem = state.tasks.find((x) => x.id === editingTaskId);
    if (tItem) {
      tItem.text = text;
      tItem.priority = priority;
      tItem.notes = notes;
    }
  } else {
    const tasksInCat = state.tasks.filter((x) => x.categoryId === cat.id);
    const maxOrder = tasksInCat.reduce((m, t) => Math.max(m, t.order ?? 0), -1);

    state.tasks.push({
      id: uid(),
      categoryId: cat.id,
      text,
      priority,
      notes,
      done: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  }

  await saveState();
  safeClose(el.taskModal);

  renderDashboard();
  updateCategorySub(cat.id);
  renderTasks();
}

/* -------------------------------------------------------
   ✅ CONFIRM INTERNAL (Promise)
------------------------------------------------------- */
let _confirmResolver = null;

function openConfirm({ title, text, okText, danger = true }) {
  return new Promise((resolve) => {
    _confirmResolver = resolve;

    el.confirmTitle.textContent = title || "Conferma";
    el.confirmText.textContent = text || "—";

    el.confirmOk.textContent = okText || t("ok");
    el.confirmOk.classList.toggle("btn--danger", !!danger);
    el.confirmOk.classList.toggle("btn--primary", !danger);

    safeShowModal(el.confirmModal);
    setTimeout(() => el.confirmOk.focus?.(), 60);
  });
}

function resolveConfirm(value) {
  safeClose(el.confirmModal);
  const r = _confirmResolver;
  _confirmResolver = null;
  if (typeof r === "function") r(!!value);
}

/* -------------------------------------------------------
   DELETE (NO confirm() browser)
------------------------------------------------------- */
async function deleteCategory(catId) {
  const cat = state.categories.find((c) => c.id === catId);
  if (!cat) return;

  const count = state.tasks.filter((t) => t.categoryId === catId).length;

  const msg =
    state.settings.lang === "it"
      ? `Eliminare "${cat.name}"?\nVerranno eliminate anche ${count} attività.`
      : `Delete "${cat.name}"?\nThis will also delete ${count} tasks.`;

  const ok = await openConfirm({
    title: t("confirmDeleteCategoryTitle"),
    text: msg,
    okText: t("delete"),
    danger: true,
  });

  if (!ok) return;

  state.categories = state.categories.filter((c) => c.id !== catId);
  state.tasks = state.tasks.filter((t) => t.categoryId !== catId);
  unlocked.delete(catId);

  if (activeCategoryId === catId) activeCategoryId = state.categories[0]?.id || null;

  await saveState();
  renderDashboard();
  goHome();
}

async function deleteTask(taskId) {
  const msg =
    state.settings.lang === "it"
      ? "Eliminare questa attività?"
      : "Delete this task?";

  const ok = await openConfirm({
    title: t("confirmDeleteTaskTitle"),
    text: msg,
    okText: t("delete"),
    danger: true,
  });

  if (!ok) return;

  state.tasks = state.tasks.filter((t) => t.id !== taskId);
  await saveState();
  renderDashboard();
  renderTasks();
}

/* -------------------------------------------------------
   DATA: Export/Import
------------------------------------------------------- */
function generateExport() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Summer List",
    version: 8,
    data: state,
  };
  el.exportArea.value = JSON.stringify(payload, null, 2);
}

async function copyExport() {
  const txt = el.exportArea.value.trim();
  if (!txt) return;

  try {
    await navigator.clipboard.writeText(txt);
    alert(t("copied"));
  } catch {
    el.exportArea.focus();
    el.exportArea.select();
    alert(t("selectedNowCopy"));
  }
}

async function applyImport() {
  const raw = el.importArea.value.trim();
  if (!raw) return;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    alert(t("invalidJson"));
    return;
  }

  const incoming = parsed?.data ?? parsed;

  const ok = await openConfirm({
    title: t("confirmImportTitle"),
    text: t("importConfirm"),
    okText: t("ok"),
    danger: false,
  });
  if (!ok) return;

  state = normalizeState(incoming);

  state.settings = state.settings || {};
  state.settings.lang = state.settings.lang || "it";
  state.settings.theme = state.settings.theme || "light";
  state.settings.font =
    typeof state.settings.font === "number" ? state.settings.font : 1.02;

  activeCategoryId = state.categories[0]?.id || null;

  await saveState();
  unlocked.clear();

  applyThemeAndFont();
  applyI18n();
  goHome();
  safeClose(el.dataSheet);
}

async function resetDemo() {
  const ok = await openConfirm({
    title: t("confirmResetTitle"),
    text: t("resetConfirm"),
    okText: t("ok"),
    danger: true,
  });
  if (!ok) return;

  await Storage.del(STORAGE_KEY);
  state = freshState();
  ensureDemoIfEmpty();

  state.settings = state.settings || { lang: "it", theme: "light", font: 1.02 };
  activeCategoryId = state.categories[0]?.id || null;

  await saveState();
  unlocked.clear();

  applyThemeAndFont();
  applyI18n();
  goHome();
  safeClose(el.dataSheet);
}

/* -------------------------------------------------------
   SETTINGS
------------------------------------------------------- */
async function setTheme(theme) {
  state.settings.theme = theme === "dark" ? "dark" : "light";
  await saveState();
  applyThemeAndFont();
}

function applyThemeAndFont() {
  document.body.setAttribute(
    "data-theme",
    state.settings.theme === "dark" ? "dark" : "light"
  );
  document.documentElement.style.setProperty("--fs", String(state.settings.font));
}

function applyI18n() {
  const lang = state.settings.lang;

  el.topSmall.textContent = el.screenHome.hidden ? t("category") : t("home");
  el.topBig.textContent = el.screenHome.hidden
    ? getActiveCategory()?.name ?? "—"
    : t("categories");

  el.homeSectionTitle.textContent = t("categories");
  el.homeTip.textContent = t("tipHome");

  el.catTip.textContent = t("tipCat");
  el.lblEditCategory.textContent = t("edit");

  el.priHigh.textContent = PRIORITY_LABEL.high[lang];
  el.priMed.textContent = PRIORITY_LABEL.med[lang];
  el.priLow.textContent = PRIORITY_LABEL.low[lang];

  el.lblTotal.textContent = t("total");
  el.lblDone.textContent = t("done");
  el.lblOpen.textContent = t("open");

  el.dataTitle.textContent = t("data");
  el.exportTitle.textContent = t("export");
  el.importTitle.textContent = t("import");
  el.btnGenerateExport.textContent = t("genJson");
  el.btnCopyExport.textContent = t("copyJson");
  el.btnApplyImport.textContent = t("applyImport");
  el.btnReset.textContent = t("reset");
  el.btnCloseData.textContent = t("close");
  el.importArea.placeholder = t("pasteHere");

  el.settingsTitle.textContent = t("settings");
  el.langTitle.textContent = t("lang");
  el.themeTitle.textContent = t("theme");
  el.fontTitle.textContent = t("fontSize");
  el.pinTitle.textContent = t("pinTitle");
  el.pinHint.textContent = t("pinHint");
  el.btnSavePin.textContent = t("savePin");
  el.lblLight.textContent = t("light");
  el.lblDark.textContent = t("dark");

  // confirm modal buttons
  el.confirmCancel.textContent = t("cancel");
}

/* -------------------------------------------------------
   STORAGE (state)
------------------------------------------------------- */
function freshState() {
  return {
    categories: [],
    tasks: [],
    ui: { activeCategoryId: null },
    settings: { lang: "it", theme: "light", font: 1.02 },
  };
}

async function loadState() {
  try {
    const rawV2 = await Storage.getString(STORAGE_KEY);
    if (rawV2) return normalizeState(JSON.parse(rawV2));

    const legacy = safeLocalStorageGet("summer_list_topplus_v1");
    if (legacy) {
      const s = normalizeState(JSON.parse(legacy));
      await Storage.setString(STORAGE_KEY, JSON.stringify(s));
      return s;
    }

    return freshState();
  } catch {
    return freshState();
  }
}

async function saveState() {
  state.ui = state.ui || {};
  state.ui.activeCategoryId = activeCategoryId;
  await Storage.setString(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(s) {
  const out = freshState();

  out.categories = Array.isArray(s?.categories) ? s.categories : [];
  out.tasks = Array.isArray(s?.tasks) ? s.tasks : [];
  out.ui = s && typeof s.ui === "object" && s.ui ? s.ui : { activeCategoryId: null };
  out.settings =
    s && typeof s.settings === "object" && s.settings ? s.settings : out.settings;

  out.categories = out.categories
    .filter((c) => c && typeof c.id === "string" && typeof c.name === "string")
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: typeof c.color === "string" ? c.color : "aqua",
      isPrivate: !!c.isPrivate,
    }));

  out.tasks = out.tasks
    .filter((t) => t && typeof t.id === "string")
    .map((t) => ({
      id: t.id,
      categoryId: typeof t.categoryId === "string" ? t.categoryId : null,
      text: typeof t.text === "string" ? t.text : "",
      priority: ["high", "med", "low"].includes(t.priority) ? t.priority : "med",
      notes: typeof t.notes === "string" ? t.notes : "",
      done: !!t.done,
      order: typeof t.order === "number" ? t.order : 0,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    }))
    .filter((t) => t.categoryId);

  out.settings.lang = out.settings.lang === "en" ? "en" : "it";
  out.settings.theme = out.settings.theme === "dark" ? "dark" : "light";
  out.settings.font =
    typeof out.settings.font === "number"
      ? clamp(out.settings.font, 0.92, 1.25)
      : 1.02;

  if (typeof out.settings.pinHash !== "string") delete out.settings.pinHash;

  const exists = out.categories.some((c) => c.id === out.ui.activeCategoryId);
  if (!exists) out.ui.activeCategoryId = out.categories[0]?.id ?? null;

  return out;
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function t(key) {
  return I18N[state.settings.lang][key];
}

function getActiveCategory() {
  return state.categories.find((c) => c.id === activeCategoryId) || null;
}

function categoryStats(catId) {
  const tasks = state.tasks.filter((x) => x.categoryId === catId);
  return { total: tasks.length, done: tasks.filter((x) => x.done).length };
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function colorClass(color) {
  const allowed = new Set(["aqua", "coral", "sand", "mint", "sky", "sunset"]);
  return "card--" + (allowed.has(color) ? color : "aqua");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* Dialog helpers */
function safeShowModal(dlg) {
  try {
    if (!dlg.open && typeof dlg.showModal === "function") dlg.showModal();
    else if (!dlg.open) dlg.setAttribute("open", "");
  } catch {
    try { dlg.setAttribute("open", ""); } catch {}
  }
}

function safeClose(dlg) {
  try {
    if (dlg.open && typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  } catch {
    try { dlg.removeAttribute("open"); } catch {}
  }
}

function addBackdropClose(dlg) {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) {
      // se è confirm modal e c'è una promise aperta → annulla
      if (dlg === el.confirmModal && _confirmResolver) resolveConfirm(false);
      else safeClose(dlg);
    }
  });
}

function safeLocalStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/* -------------------------------------------------------
   DEMO
------------------------------------------------------- */
function ensureDemoIfEmpty() {
  if (state.categories.length) return;

  const c1 = { id: uid(), name: "Attività", color: "aqua", isPrivate: false };
  const c2 = { id: uid(), name: "Drink", color: "sunset", isPrivate: false };

  state.categories = [c1, c2];
  state.tasks = [
    { id: uid(), categoryId: c1.id, text: "Uscire", priority: "med", notes: "", done: false, order: 0, createdAt: Date.now() },
    { id: uid(), categoryId: c1.id, text: "Fun", priority: "low", notes: "Idee per serata", done: true, order: 1, createdAt: Date.now() },
    { id: uid(), categoryId: c2.id, text: "Limonata", priority: "low", notes: "Menta + ghiaccio", done: false, order: 0, createdAt: Date.now() },
  ];

  state.settings = state.settings || { lang: "it", theme: "light", font: 1.02 };
}
