// ============================================
// ADMIN PANEL - CORE LOGIC
// ============================================

let sessionPassword = '';
let menuData = null;
let currentFileSha = null;

// ---- DOM References ----
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const logoutBtn = document.getElementById('logout-btn');
const categoriesContainer = document.getElementById('categories-container');
const addCategoryBtn = document.getElementById('add-category-btn');
const itemModal = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const modalCancel = document.getElementById('modal-cancel');
const catModal = document.getElementById('cat-modal');
const catForm = document.getElementById('cat-form');
const catModalCancel = document.getElementById('cat-modal-cancel');

// --- White-Label Hydration ---
const hydrateAdminUI = () => {
    if (typeof SETTINGS === 'undefined') return;

    // 1. Inject Text
    document.querySelectorAll('[data-hydrate]').forEach(el => {
        const key = el.dataset.hydrate;
        if (SETTINGS[key]) {
            el.textContent = SETTINGS[key];
        }
    });

    // 2. Inject CSS Variables
    const root = document.documentElement;
    const theme = SETTINGS.theme;
    if (theme) {
        root.style.setProperty('--bg', theme.bgPrimary);
        root.style.setProperty('--bg-header', theme.bgHeader);
        root.style.setProperty('--gold', theme.accentTeal);
        root.style.setProperty('--accent-pink', theme.accentPink);
        root.style.setProperty('--text', theme.textPrimary);
        root.style.setProperty('--text-muted', theme.textSecondary);
        root.style.setProperty('--font', theme.fontHeading);
        root.style.setProperty('--font-body', theme.fontBody);
    }
};

hydrateAdminUI();

// ---- Authentication ----
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    loginError.classList.add('hidden');

    sessionPassword = pw;

    try {
        await loadMenu();
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
    } catch (err) {
        sessionPassword = '';
        if (err.message.includes('401')) {
            loginError.textContent = 'Falsches Passwort.';
        } else {
            loginError.textContent = 'Verbindungsfehler: ' + err.message;
        }
        loginError.classList.remove('hidden');
        document.getElementById('password').value = '';
    } finally {
        submitBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    document.getElementById('password').value = '';
    sessionPassword = '';
    menuData = null;
    currentFileSha = null;
});

// ---- API Helper ----
async function proxyRequest(method, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': sessionPassword,
        },
    };
    if (body) options.body = JSON.stringify(body);

    const proxyUrl = typeof SETTINGS !== 'undefined' ? SETTINGS.proxyUrl : '';
    const res = await fetch(proxyUrl, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${err.error || 'Request failed'}`);
    }
    return res.json();
}

// ---- Load Menu via Proxy ----
async function loadMenu() {
    categoriesContainer.innerHTML = '<p style="text-align:center;color:#888;padding:3rem;">Lade Speisekarte...</p>';

    try {
        const fileData = await proxyRequest('GET');
        currentFileSha = fileData.sha;
        const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        menuData = JSON.parse(decoded);
        categoriesContainer.innerHTML = '';
        renderDashboard();
    } catch (err) {
        if (err.message.startsWith('401:')) {
            throw err;
        }

        console.warn('Proxy nicht erreichbar, lade lokale menu.json:', err.message);
        try {
            const res = await fetch('../menu.json');
            menuData = await res.json();
            currentFileSha = null;
            categoriesContainer.innerHTML = '';
            showConfigNotice(err.message);
            renderDashboard();
        } catch {
            categoriesContainer.innerHTML = `
                <div style="text-align:center;padding:3rem;color:#c0392b;">
                    <p>❌ Proxy nicht erreichbar und keine lokale menu.json gefunden.</p>
                    <p style="font-size:0.85rem;color:#888;margin-top:0.5rem;">Bitte <code>settings.js</code> (proxyUrl) prüfen.</p>
                </div>`;
        }
    }
}

function showConfigNotice(errMsg = '') {
    const notice = document.createElement('div');
    notice.className = 'config-notice';
    notice.innerHTML = `⚠️ <strong>Lokaler Modus:</strong> Cloudflare Worker konnte nicht erreicht werden. 
    <br><small style="opacity:0.8;">Fehler: ${errMsg}</small>
    <br><br>Änderungen werden nur lokal angezeigt und nicht gespeichert. Bitte <code>settings.js</code> prüfen.`;
    categoriesContainer.appendChild(notice);
}

// ---- Render Dashboard ----
function renderDashboard() {
    const notice = categoriesContainer.querySelector('.config-notice');
    categoriesContainer.innerHTML = '';
    if (notice) categoriesContainer.appendChild(notice);

    menuData.categories.forEach((cat, catIdx) => {
        const block = document.createElement('div');
        block.className = 'category-block';

        const catName = cat.name['de'] || 'N/A';

        block.innerHTML = `
            <div class="category-header ${cat.hidden ? 'is-hidden' : ''}">
                <div class="category-title-area">
                    <span class="category-name">${catName}</span>
                    ${cat.hidden ? '<span class="badge-hidden">AUSGEBLENDET</span>' : ''}
                </div>
                <div class="category-actions">
                    <button class="btn btn-ghost btn-sm toggle-cat-btn" data-cat-idx="${catIdx}">
                        ${cat.hidden ? '👁 Einblenden' : '🚫 Ausblenden'}
                    </button>
                    <button class="btn btn-ghost btn-sm edit-cat-btn" data-cat-idx="${catIdx}">✏️ Umbenennen</button>
                    <button class="btn btn-danger btn-sm delete-cat-btn" data-cat-idx="${catIdx}">🗑 Kategorie löschen</button>
                </div>
            </div>
            <div class="item-list ${cat.hidden ? 'hidden' : ''}" id="item-list-${catIdx}">
                ${cat.items.map((item, itemIdx) => renderItemRow(item, catIdx, itemIdx)).join('')}
            </div>
            <div class="add-item-row ${cat.hidden ? 'hidden' : ''}">
                <button class="btn btn-secondary add-item-btn" data-cat-idx="${catIdx}">+ Gericht hinzufügen</button>
            </div>
        `;
        categoriesContainer.appendChild(block);
    });

    document.querySelectorAll('.add-item-btn').forEach(btn =>
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx))));
    document.querySelectorAll('.edit-item-btn').forEach(btn =>
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx))));
    document.querySelectorAll('.delete-item-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx))));
    document.querySelectorAll('.delete-cat-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteCategory(parseInt(btn.dataset.catIdx))));
    document.querySelectorAll('.edit-cat-btn').forEach(btn =>
        btn.addEventListener('click', () => openCatModal(parseInt(btn.dataset.catIdx))));
    document.querySelectorAll('.toggle-cat-btn').forEach(btn =>
        btn.addEventListener('click', () => toggleCategoryVisibility(parseInt(btn.dataset.catIdx))));
}

function toggleCategoryVisibility(catIdx) {
    menuData.categories[catIdx].hidden = !menuData.categories[catIdx].hidden;
    renderDashboard();
}

function renderItemRow(item, catIdx, itemIdx) {
    const name = item.name['de'] || 'N/A';
    const desc = item.desc ? item.desc['de'] : '';
    const isSoldOut = item.isSoldOut === true;

    return `
        <div class="item-row ${isSoldOut ? 'is-unavailable' : ''}">
            <div class="item-info">
                <div class="item-row-name">
                    ${name}
                    ${isSoldOut ? '<span class="badge-aus">AUS</span>' : ''}
                </div>
                ${desc ? `<div class="item-row-desc">${desc}</div>` : ''}
            </div>
            <div class="item-row-price">€ ${item.price}</div>
            <div class="item-actions">
                <button class="btn-icon edit-item-btn" data-cat-idx="${catIdx}" data-item-idx="${itemIdx}" title="Bearbeiten">✏️</button>
                <button class="btn-icon delete delete-item-btn" data-cat-idx="${catIdx}" data-item-idx="${itemIdx}" title="Löschen">🗑</button>
            </div>
        </div>`;
}

// ---- Item Modal ----
function openItemModal(catIdx, itemIdx = null) {
    document.getElementById('item-cat-id').value = catIdx;
    document.getElementById('item-index').value = itemIdx !== null ? itemIdx : '';

    if (itemIdx !== null) {
        const item = menuData.categories[catIdx].items[itemIdx];
        modalTitle.textContent = 'Gericht bearbeiten';
        document.getElementById('item-name-de').value = item.name['de'] || '';
        document.getElementById('item-name-en').value = item.name['en'] || '';
        document.getElementById('item-name-tr').value = item.name['tr'] || '';
        document.getElementById('item-name-es').value = item.name['es'] || '';
        document.getElementById('item-desc-de').value = item.desc ? (item.desc['de'] || '') : '';
        document.getElementById('item-desc-en').value = item.desc ? (item.desc['en'] || '') : '';
        document.getElementById('item-desc-tr').value = item.desc ? (item.desc['tr'] || '') : '';
        document.getElementById('item-desc-es').value = item.desc ? (item.desc['es'] || '') : '';
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-available').checked = item.isSoldOut === true;
    } else {
        modalTitle.textContent = 'Gericht hinzufügen';
        itemForm.reset();
        document.getElementById('item-available').checked = false;
    }
    itemModal.classList.remove('hidden');
}

modalCancel.addEventListener('click', () => itemModal.classList.add('hidden'));
itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.classList.add('hidden'); });

itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const catIdx = parseInt(document.getElementById('item-cat-id').value);
    const rawIdx = document.getElementById('item-index').value;
    const itemIdx = rawIdx !== '' ? parseInt(rawIdx) : null;

    const newItem = {
        name: {
            de: document.getElementById('item-name-de').value.trim(),
            en: document.getElementById('item-name-en').value.trim(),
            tr: document.getElementById('item-name-tr').value.trim(),
            es: document.getElementById('item-name-es').value.trim()
        },
        price: document.getElementById('item-price').value.trim(),
        isSoldOut: document.getElementById('item-available').checked,
        desc: {
            de: document.getElementById('item-desc-de').value.trim(),
            en: document.getElementById('item-desc-en').value.trim(),
            tr: document.getElementById('item-desc-tr').value.trim(),
            es: document.getElementById('item-desc-es').value.trim()
        }
    };

    if (itemIdx !== null) {
        menuData.categories[catIdx].items[itemIdx] = newItem;
    } else {
        menuData.categories[catIdx].items.push(newItem);
    }
    itemModal.classList.add('hidden');
    renderDashboard();
});

function deleteItem(catIdx, itemIdx) {
    if (!confirm(`"${menuData.categories[catIdx].items[itemIdx].name['de']}" wirklich löschen?`)) return;
    menuData.categories[catIdx].items.splice(itemIdx, 1);
    renderDashboard();
}

// ---- Category Modal ----
let editingCatIdx = null;

function openCatModal(catIdx = null) {
    editingCatIdx = catIdx;
    catForm.reset();
    if (catIdx !== null) {
        const cat = menuData.categories[catIdx];
        document.getElementById('cat-name-de').value = cat.name['de'] || '';
        document.getElementById('cat-name-en').value = cat.name['en'] || '';
        document.getElementById('cat-name-tr').value = cat.name['tr'] || '';
        document.getElementById('cat-name-es').value = cat.name['es'] || '';
    }
    catModal.classList.remove('hidden');
}

addCategoryBtn.addEventListener('click', () => openCatModal());
catModalCancel.addEventListener('click', () => catModal.classList.add('hidden'));
catModal.addEventListener('click', (e) => { if (e.target === catModal) catModal.classList.add('hidden'); });

catForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameDe = document.getElementById('cat-name-de').value.trim();
    const nameData = {
        de: nameDe,
        en: document.getElementById('cat-name-en').value.trim(),
        tr: document.getElementById('cat-name-tr').value.trim(),
        es: document.getElementById('cat-name-es').value.trim()
    };

    if (editingCatIdx !== null) {
        menuData.categories[editingCatIdx].name = nameData;
    } else {
        const id = nameDe.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        menuData.categories.push({ id, name: nameData, items: [] });
    }

    catModal.classList.add('hidden');
    renderDashboard();
});

function deleteCategory(catIdx) {
    const cat = menuData.categories[catIdx];
    if (!confirm(`Kategorie "${cat.name.de}" mit ${cat.items.length} Gerichten wirklich löschen?`)) return;
    menuData.categories.splice(catIdx, 1);
    renderDashboard();
}

// ---- Save via Proxy ----
saveBtn.addEventListener('click', saveMenu);

async function saveMenu() {
    if (!currentFileSha) {
        setSaveStatus('Kein Proxy konfiguriert – lokaler Modus.', 'error');
        return;
    }

    saveBtn.disabled = true;
    setSaveStatus('Speichern...', '');

    try {
        const jsonString = JSON.stringify(menuData, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonString)));

        const result = await proxyRequest('POST', { content, sha: currentFileSha });
        currentFileSha = result.content.sha;
        setSaveStatus('✓ Gespeichert! Menü wird in ca. 3 Min. aktualisiert.', 'success');
    } catch (err) {
        setSaveStatus(`Fehler: ${err.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

function setSaveStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = 'save-status ' + type;
    if (type === 'success') {
        setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 5000);
    }
}
