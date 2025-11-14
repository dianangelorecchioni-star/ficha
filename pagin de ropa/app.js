function qs(selector, scope = document) { return scope.querySelector(selector); }
function qsa(selector, scope = document) { return Array.from(scope.querySelectorAll(selector)); }

function formatCurrencyARS(value) {
    try {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    } catch (_) {
        return `$${value}`;
    }
}

const Cart = (() => {
    const STORAGE_KEY = 'qwerty_cart_v1';
    let items = [];

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            items = raw ? JSON.parse(raw) : [];
        } catch (_) {
            items = [];
        }
    }
    function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    function count() { return items.reduce((a, it) => a + it.qty, 0); }
    function total() { return items.reduce((a, it) => a + it.price * it.qty, 0); }
    function add(product) {
        const existing = items.find(it => it.id === product.id);
        if (existing) existing.qty += 1; else items.push({ ...product, qty: 1 });
        persist();
    }
    function remove(id) {
        items = items.filter(it => it.id !== id);
        persist();
    }
    function all() { return items.slice(); }

    load();
    return { add, remove, all, count, total };
})();

function updateCartBadge() {
    const badge = qs('#cartCount');
    if (badge) badge.textContent = String(Cart.count());
}

function renderCart() {
    const list = qs('#cartItems');
    const totalEl = qs('#cartTotal');
    if (!list || !totalEl) return;
    list.innerHTML = '';

    const items = Cart.all();
    if (!items.length) {
        list.innerHTML = '<p style="color:#a7aab5; text-align:center; margin: 16px 0;">Tu carrito está vacío</p>';
    } else {
        items.forEach(it => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            const imgSrc = it.image || '';
            row.innerHTML = `
                <img src="${imgSrc}" alt="${it.name}">
                <div>
                    <div class=\"title\">${it.name}</div>
                    <div class=\"qty\">x${it.qty} · ${formatCurrencyARS(it.price)}</div>
                </div>
                <div><strong>${formatCurrencyARS(it.price * it.qty)}</strong></div>
                <button class=\"remove\" data-remove-id=\"${it.id}\">Quitar</button>
            `;
            list.appendChild(row);
        });
    }
    totalEl.textContent = formatCurrencyARS(Cart.total());

    qsa('[data-remove-id]', list).forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-remove-id');
            Cart.remove(id);
            updateCartBadge();
            renderCart();
        });
    });
}

function setupCartDialog() {
    const btn = qs('#cartButton');
    const dialog = qs('#cartDialog');
    const closeBtn = qs('#closeCart');
    if (!btn || !dialog || !closeBtn) return;

    btn.addEventListener('click', () => {
        renderCart();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    });
    closeBtn.addEventListener('click', () => {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    });
}

function toggleCard(card, showInfo) {
    const img = qs('.imagen', card);
    const info = qs('.info', card);
    if (!img || !info) return;
    if (showInfo) {
        img.style.display = 'none';
        info.style.display = 'block';
    } else {
        info.style.display = 'none';
        img.style.display = 'block';
    }
}

function setupProducts() {
    qsa('.producto').forEach(card => {
        const imgToggle = qsa('[data-toggle="details"]', card);
        imgToggle.forEach(el => el.addEventListener('click', () => toggleCard(card, true)));
        const backBtn = qsa('[data-toggle="image"]', card);
        backBtn.forEach(el => el.addEventListener('click', () => toggleCard(card, false)));

        const addBtn = qs('[data-add-to-cart]', card);
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const id = card.id;
                const name = qs('.name', card)?.textContent?.trim() || card.getAttribute('data-name') || 'Producto';
                const rawPrice = Number(card.getAttribute('data-price') || 0);
                const image = qs('img', card)?.getAttribute('src') || '';
                Cart.add({ id, name, price: rawPrice, image });
                updateCartBadge();
                addBtn.disabled = true;
                const prev = addBtn.textContent;
                addBtn.textContent = 'Agregado ✓';
                setTimeout(() => { addBtn.disabled = false; addBtn.textContent = prev; }, 900);
            });
        }
    });
}

// Búsqueda (si existiera el input en otras páginas)
function setupSearch() {
    const input = qs('#searchInput');
    if (!input) return;
    const products = qsa('.producto');
    function applyFilter() {
        const q = input.value.trim().toLowerCase();
        products.forEach(card => {
            const name = (card.getAttribute('data-name') || '').toLowerCase();
            const material = (card.getAttribute('data-material') || '').toLowerCase();
            const match = !q || name.includes(q) || material.includes(q);
            card.style.display = match ? '' : 'none';
        });
    }
    input.addEventListener('input', applyFilter);
}

// Favoritos
const Favorites = (() => {
    const STORAGE_KEY = 'qwerty_favs_v1';
    let ids = new Set();
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            ids = new Set(arr);
        } catch (_) { ids = new Set(); }
    }
    function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids))); }
    function has(id) { return ids.has(id); }
    function add(id) { ids.add(id); persist(); }
    function remove(id) { ids.delete(id); persist(); }
    function all() { return Array.from(ids); }
    function count() { return ids.size; }
    load();
    return { has, add, remove, all, count };
})();

function toast(message) {
    const container = qs('#toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; }, 1800);
    setTimeout(() => { el.remove(); }, 2200);
}

function setupFavorites() {
    qsa('[data-fav-toggle]').forEach(btn => {
        const card = btn.closest('.producto');
        if (!card) return;
        const id = card.id;
        const update = () => btn.setAttribute('aria-pressed', Favorites.has(id) ? 'true' : 'false');
        update();
        btn.addEventListener('click', () => {
            if (Favorites.has(id)) { Favorites.remove(id); toast('Quitado de favoritos'); }
            else { Favorites.add(id); toast('Agregado a favoritos'); }
            update();
            updateFavBadge();
        });
    });
}

function updateFavBadge() {
    const el = qs('#favCount');
    if (el) el.textContent = String(Favorites.count());
}

function renderFavorites() {
    const list = qs('#favItems');
    if (!list) return;
    list.innerHTML = '';
    const ids = Favorites.all();
    if (!ids.length) {
        list.innerHTML = '<p style="color:#a7aab5; text-align:center; margin: 16px 0;">No tenés favoritos aún</p>';
        return;
    }
    ids.forEach(id => {
        const card = qs('#' + CSS.escape(id));
        if (!card) return;
        const name = qs('.name', card)?.textContent?.trim() || card.getAttribute('data-name') || 'Producto';
        const price = Number(card.getAttribute('data-price') || 0);
        const img = qs('img', card)?.getAttribute('src') || '';
        const row = document.createElement('div');
        row.className = 'fav-row';
        row.innerHTML = `
            <img src="${img}" alt="${name}">
            <div>
                <div class="title">${name}</div>
                <div class="meta">${formatCurrencyARS(price)}</div>
            </div>
            <div class="actions">
                <button class="secondary" data-fav-remove="${id}">Quitar</button>
                <button class="primary" data-fav-addcart="${id}">Agregar al carrito</button>
            </div>
        `;
        list.appendChild(row);
    });

    qsa('[data-fav-remove]', list).forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-fav-remove');
            Favorites.remove(id);
            toast('Quitado de favoritos');
            updateFavBadge();
            renderFavorites();
            // reflect on product card button
            const toggleBtn = qs('#' + CSS.escape(id) + ' [data-fav-toggle]');
            if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'false');
        });
    });
    qsa('[data-fav-addcart]', list).forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-fav-addcart');
            const card = qs('#' + CSS.escape(id));
            if (!card) return;
            const name = qs('.name', card)?.textContent?.trim() || card.getAttribute('data-name') || 'Producto';
            const price = Number(card.getAttribute('data-price') || 0);
            const image = qs('img', card)?.getAttribute('src') || '';
            Cart.add({ id, name, price, image });
            updateCartBadge();
            toast('Agregado al carrito');
        });
    });
}

function setupFavoritesDialog() {
    const btn = qs('#favoritesButton');
    const dialog = qs('#favoritesDialog');
    const closeBtn = qs('#closeFavs');
    if (!btn || !dialog || !closeBtn) return;
    btn.addEventListener('click', () => {
        renderFavorites();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    });
    closeBtn.addEventListener('click', () => {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    });
}

function setupFiltersAndSort() {
    const cards = qsa('.producto');
    const materials = Array.from(new Set(cards.map(c => (c.getAttribute('data-material') || '').trim()).filter(Boolean)));
    const filtersWrap = qs('#materialFilters');
    const sortSelect = qs('#sortSelect');
    let active = new Set();

    if (filtersWrap) {
        materials.forEach(mat => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = mat;
            chip.type = 'button';
            chip.setAttribute('aria-pressed', 'false');
            chip.addEventListener('click', () => {
                if (active.has(mat)) active.delete(mat); else active.add(mat);
                chip.setAttribute('aria-pressed', active.has(mat) ? 'true' : 'false');
                apply();
            });
            filtersWrap.appendChild(chip);
        });
    }

    function applyFilter() {
        cards.forEach(card => {
            const material = (card.getAttribute('data-material') || '').trim();
            const ok = active.size === 0 || active.has(material);
            card.style.display = ok ? '' : 'none';
        });
    }

    function applySort() {
        if (!sortSelect) return;
        const value = sortSelect.value;
        const list = qs('#products');
        if (!list) return;
        const visibleCards = qsa('.producto').filter(c => c.style.display !== 'none');
        const toSort = Array.from(visibleCards);
        const getName = c => (c.getAttribute('data-name') || '').toLowerCase();
        const getPrice = c => Number(c.getAttribute('data-price') || 0);
        if (value === 'price-asc') toSort.sort((a,b) => getPrice(a) - getPrice(b));
        else if (value === 'price-desc') toSort.sort((a,b) => getPrice(b) - getPrice(a));
        else if (value === 'name-asc') toSort.sort((a,b) => getName(a).localeCompare(getName(b)));
        else if (value === 'name-desc') toSort.sort((a,b) => getName(b).localeCompare(getName(a)));
        else return; // default
        toSort.forEach(c => list.appendChild(c));
    }

    function apply() { applyFilter(); applySort(); }

    if (sortSelect) sortSelect.addEventListener('change', apply);
}

function setupToTop() {
    const btn = qs('#toTopBtn');
    if (!btn) return;
    const onScroll = () => { if (window.scrollY > 300) btn.classList.add('show'); else btn.classList.remove('show'); };
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    onScroll();
}

document.addEventListener('DOMContentLoaded', () => {
    setupProducts();
    setupSearch();
    setupFavorites();
    setupFavoritesDialog();
    setupFiltersAndSort();
    setupToTop();
    setupCartDialog();
    updateCartBadge();
    updateFavBadge();

    // Estado inicial: mostrar imagen en todas las cards
    qsa('.producto').forEach(card => toggleCard(card, false));
});


