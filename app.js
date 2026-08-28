const scrollView = document.querySelector("#scrollView");
const bottomNav = document.querySelector(".bottom-nav");
const toast = document.querySelector("#toast");
const pages = [...document.querySelectorAll(".app-page")];
const bottomItems = [...document.querySelectorAll(".bottom-item")];
const pageNames = { home: "首页", pool: "赏池", draw: "抽卡", cart: "购物车", mine: "我的" };
const scrollPositions = new Map();
let currentPage = null;
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function closeTransientUi() {
  if (activeDialog) closeDialog({ restoreFocus: false });
}

function activatePage(page, options = {}) {
  const nextPage = pageNames[page] ? page : "home";
  if (currentPage) scrollPositions.set(currentPage, scrollView.scrollTop);
  currentPage = nextPage;
  pages.forEach((item) => item.classList.toggle("is-active", item.dataset.page === nextPage));
  bottomItems.forEach((item) => {
    const selected = item.dataset.pageTarget === nextPage;
    item.classList.toggle("is-active", selected);
    if (selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  closeTransientUi();
  const nextTop = options.reset ? 0 : scrollPositions.get(nextPage) || 0;
  scrollView.scrollTo({ top: nextTop, behavior: options.instant ? "auto" : "smooth" });
  document.title = `谷多多 · ${pageNames[nextPage]}`;
}

function navigate(page, options = {}) {
  if (!pageNames[page]) return;
  if (currentPage === page) {
    activatePage(page, { reset: options.reset !== false });
    return;
  }
  window.location.hash = page;
}

function routeFromHash(options = {}) {
  activatePage(window.location.hash.slice(1) || "home", options);
}

function scrollToTarget(id) {
  if (currentPage !== "home") navigate("home");
  window.setTimeout(() => {
    const target = document.getElementById(id);
    if (!target) return;
    const top = id === "top" ? 0 : target.offsetTop - 160;
    scrollView.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, currentPage === "home" ? 0 : 80);
}

document.querySelectorAll("[data-toast]").forEach((control) => {
  control.addEventListener("click", (event) => {
    if (control.closest("[data-product]") && control !== control.closest("[data-product]")) event.stopPropagation();
    showToast(control.dataset.toast);
  });
});

document.querySelectorAll("[data-go-page]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.stopPropagation();
    navigate(control.dataset.goPage);
  });
});

bottomItems.forEach((item) => item.addEventListener("click", () => navigate(item.dataset.pageTarget)));

/* Home filters */
const productCards = [...document.querySelectorAll(".product-card[data-product]")];
const productsHeading = document.querySelector("#productsTitle");
const productEmpty = document.querySelector("#productEmpty");
let activeHomeIp = "全部IP";
let activeHomeChannel = "推荐";

function productFromCard(card, index = productCards.indexOf(card)) {
  return {
    id: `product-${index}`,
    name: card.dataset.product,
    ip: card.dataset.ip,
    kind: card.dataset.kind,
    state: card.dataset.state,
    price: Number(card.dataset.price),
    shipping: card.dataset.shipping,
    image: card.querySelector("img")?.src || "",
    card,
  };
}

const productCatalog = productCards.map(productFromCard);

function applyHomeFilters({ announce = true } = {}) {
  let visibleCount = 0;
  productCards.forEach((card) => {
    const ipMatch = activeHomeIp === "全部IP" || card.dataset.ip === activeHomeIp;
    const channelMatch =
      activeHomeChannel === "推荐" ||
      (activeHomeChannel === "每日上新" && card.dataset.state === "上新") ||
      (activeHomeChannel === "单领" && card.dataset.kind === "单领") ||
      (activeHomeChannel === "现货速发" && card.dataset.state === "现货");
    const visible = ipMatch && channelMatch;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  const labels = [activeHomeChannel === "推荐" ? "猜你喜欢" : activeHomeChannel];
  if (activeHomeIp !== "全部IP") labels.push(activeHomeIp);
  productsHeading.textContent = `${labels.join(" · ")}（${visibleCount}）`;
  productEmpty.hidden = visibleCount !== 0;
  if (announce) showToast(`已筛选出 ${visibleCount} 件商品`);
}

function setChannelState(label) {
  activeHomeChannel = label;
  document.querySelectorAll(".channel-tab").forEach((item) => {
    const selected = item.textContent.trim() === label;
    item.classList.toggle("is-active", selected);
    if (selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

document.querySelectorAll(".channel-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const label = tab.textContent.trim();
    if (tab.dataset.goPage) return;
    setChannelState(label);
    applyHomeFilters();
    scrollToTarget(tab.dataset.target || "products");
  });
});

document.querySelectorAll(".ip-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    activeHomeIp = filter.dataset.ip;
    document.querySelectorAll(".ip-filter").forEach((item) => {
      const selected = item === filter;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyHomeFilters();
    scrollToTarget("products");
  });
});

document.querySelectorAll(".quick-card").forEach((card) => {
  card.addEventListener("click", () => {
    if (card.dataset.goPage) return;
    if (card.textContent.includes("现货速发")) {
      setChannelState("现货速发");
      applyHomeFilters();
      scrollToTarget("products");
    } else if (card.dataset.target) scrollToTarget(card.dataset.target);
  });
});

document.querySelectorAll("[data-target]:not(.channel-tab):not(.quick-card)").forEach((control) => {
  control.addEventListener("click", () => scrollToTarget(control.dataset.target));
});

/* Pool filters and detail */
const poolGrid = document.querySelector(".pool-grid");
const poolCards = [...document.querySelectorAll(".pool-grid [data-pool]")];
const poolEmpty = document.querySelector("#poolEmpty");
const hotPoolTitle = document.querySelector("#hotPoolTitle");
let activePoolType = "综合";
let activePoolIp = "全部";
let activePoolSort = "最新";
poolCards.forEach((card, index) => (card.dataset.order = String(index)));

function applyPoolFilters({ announce = true } = {}) {
  const sorted = [...poolCards].sort((a, b) => {
    if (activePoolSort === "人气") return Number(b.dataset.popularity) - Number(a.dataset.popularity);
    if (activePoolSort === "将结束") return Number(a.dataset.remaining) - Number(b.dataset.remaining);
    return Number(a.dataset.order) - Number(b.dataset.order);
  });
  sorted.forEach((card) => poolGrid.append(card));
  let visibleCount = 0;
  sorted.forEach((card) => {
    const typeMatch =
      activePoolType === "综合" ||
      card.dataset.poolType === activePoolType ||
      (activePoolType === "即将结束" && Number(card.dataset.remaining) <= 20);
    const ipMatch = activePoolIp === "全部" || card.dataset.poolIp === activePoolIp;
    card.hidden = !(typeMatch && ipMatch);
    if (!card.hidden) visibleCount += 1;
  });
  hotPoolTitle.textContent = `正在热抽（${visibleCount}）`;
  poolEmpty.hidden = visibleCount !== 0;
  poolGrid.classList.toggle("is-single", visibleCount === 1);
  if (announce) showToast(`已更新 ${visibleCount} 个赏池`);
}

document.querySelectorAll(".segmented-tabs [data-pool-type]").forEach((button) => {
  button.addEventListener("click", () => {
    activePoolType = button.dataset.poolType;
    button.parentElement.querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyPoolFilters();
  });
});

document.querySelectorAll("[data-pool-ip-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activePoolIp = button.dataset.poolIpFilter;
    button.parentElement.querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyPoolFilters();
  });
});

document.querySelector("[data-pool-reset]").addEventListener("click", () => {
  activePoolIp = "全部";
  document.querySelectorAll("[data-pool-ip-filter]").forEach((item) => {
    const selected = item.dataset.poolIpFilter === "全部";
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  applyPoolFilters();
});

document.querySelectorAll("[data-pool-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    activePoolSort = button.dataset.poolSort;
    button.parentElement.querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyPoolFilters();
  });
});

/* Dialog controller */
const searchOverlay = document.querySelector("#searchOverlay");
const sheetBackdrop = document.querySelector("#sheetBackdrop");
const productSheet = document.querySelector("#productSheet");
const checkoutSheet = document.querySelector("#checkoutSheet");
const poolSheet = document.querySelector("#poolSheet");
const drawConfirmSheet = document.querySelector("#drawConfirmSheet");
const accountSheet = document.querySelector("#accountSheet");
const drawResult = document.querySelector("#drawResult");
let activeDialog = null;
let lastDialogTrigger = null;

function focusableWithin(element) {
  return [...element.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(
    (item) => !item.hidden && item.getClientRects().length,
  );
}

function setAppBackgroundInert(value) {
  scrollView.inert = value;
  bottomNav.inert = value;
}

function openDialog(dialog, trigger = document.activeElement) {
  const previousDialog = activeDialog;
  const previousTrigger = lastDialogTrigger;
  if (activeDialog) closeDialog({ restoreFocus: false });
  activeDialog = dialog;
  const triggerIsInsidePrevious = previousDialog && trigger instanceof HTMLElement && previousDialog.contains(trigger);
  lastDialogTrigger = triggerIsInsidePrevious && previousTrigger ? previousTrigger : trigger instanceof HTMLElement ? trigger : null;
  dialog.hidden = false;
  dialog.setAttribute("aria-hidden", "false");
  setAppBackgroundInert(true);
  if (dialog !== searchOverlay) {
    sheetBackdrop.classList.add("is-open");
    sheetBackdrop.setAttribute("aria-hidden", "false");
  }
  window.requestAnimationFrame(() => {
    dialog.classList.add("is-open");
    window.setTimeout(() => focusableWithin(dialog)[0]?.focus(), 40);
  });
}

function closeDialog({ restoreFocus = true } = {}) {
  if (!activeDialog) return;
  const closing = activeDialog;
  activeDialog = null;
  closing.classList.remove("is-open");
  closing.setAttribute("aria-hidden", "true");
  closing.hidden = true;
  sheetBackdrop.classList.remove("is-open");
  sheetBackdrop.setAttribute("aria-hidden", "true");
  setAppBackgroundInert(false);
  if (restoreFocus && lastDialogTrigger?.isConnected) lastDialogTrigger.focus();
  lastDialogTrigger = null;
}

document.querySelectorAll("[data-close-overlay], [data-close-sheet], [data-close-result]").forEach((button) =>
  button.addEventListener("click", () => closeDialog()),
);
sheetBackdrop.addEventListener("click", () => closeDialog());

/* Search */
const globalSearchInput = document.querySelector("#globalSearchInput");
const searchResults = document.querySelector("#searchResults");
const searchResultTitle = document.querySelector("#searchResultTitle");
const searchResultList = document.querySelector("#searchResultList");
const searchEmpty = document.querySelector("#searchEmpty");

function resetSearchView() {
  document.querySelectorAll(".search-default-block").forEach((block) => (block.hidden = false));
  searchResults.hidden = true;
  searchResultList.innerHTML = "";
  searchEmpty.hidden = true;
}

function openSearch(query = "", trigger = document.activeElement) {
  resetSearchView();
  globalSearchInput.value = query;
  openDialog(searchOverlay, trigger);
  window.setTimeout(() => globalSearchInput.focus(), 70);
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function runSearch(query) {
  const needle = normalize(query);
  if (!needle) return showToast("请输入 IP、角色或商品");
  const productMatches = productCatalog.filter((item) => normalize(`${item.name}${item.ip}${item.kind}${item.state}${item.shipping}`).includes(needle));
  const allPools = [...document.querySelectorAll("[data-pool]")];
  const poolMatches = allPools.filter((item) => normalize(`${item.dataset.pool}${item.dataset.poolIp}${item.dataset.poolType}`).includes(needle));
  document.querySelectorAll(".search-default-block").forEach((block) => (block.hidden = true));
  searchResults.hidden = false;
  searchResultTitle.textContent = `“${query}” · ${productMatches.length + poolMatches.length} 个结果`;
  searchResultList.innerHTML = "";
  productMatches.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.searchProduct = item.id;
    button.innerHTML = `<img src="${item.image}" alt=""><span><strong>${item.name}</strong><small>${item.ip} · ${item.state} · ¥${item.price}</small></span><b>商品</b>`;
    searchResultList.append(button);
  });
  poolMatches.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.searchPool = String(allPools.indexOf(item));
    const image = item.querySelector("img")?.src || "";
    button.innerHTML = `<img src="${image}" alt=""><span><strong>${item.dataset.pool}</strong><small>${item.dataset.poolIp} · ${item.dataset.poolType}</small></span><b>赏池</b>`;
    searchResultList.append(button);
  });
  searchEmpty.hidden = productMatches.length + poolMatches.length !== 0;
  showToast(productMatches.length + poolMatches.length ? "搜索结果已更新" : "没有找到相关内容");
}

document.querySelectorAll("[data-open-search]").forEach((button) => button.addEventListener("click", () => openSearch("", button)));
const homeSearchInput = document.querySelector("#searchInput");
document.querySelector("#searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  openSearch(homeSearchInput.value, homeSearchInput);
});
homeSearchInput.addEventListener("click", () => openSearch(homeSearchInput.value, homeSearchInput));
document.querySelector("#globalSearchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(globalSearchInput.value);
});
document.querySelectorAll("[data-search-query]").forEach((button) => button.addEventListener("click", () => {
  globalSearchInput.value = button.dataset.searchQuery;
  runSearch(button.dataset.searchQuery);
}));
document.querySelector("[data-reset-search]").addEventListener("click", () => {
  globalSearchInput.value = "";
  resetSearchView();
  globalSearchInput.focus();
});
document.querySelector("[data-clear-history]").addEventListener("click", () => {
  document.querySelector("#searchHistory").innerHTML = "<span class='empty-history'>暂无搜索记录</span>";
  showToast("搜索记录已清空");
});

searchResultList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.searchProduct) {
    const product = productCatalog.find((item) => item.id === button.dataset.searchProduct);
    closeDialog({ restoreFocus: false });
    if (product) openProduct(product.card, product.card);
  } else if (button.dataset.searchPool) {
    const pool = [...document.querySelectorAll("[data-pool]")][Number(button.dataset.searchPool)];
    closeDialog({ restoreFocus: false });
    navigate("pool");
    window.setTimeout(() => openPool(pool, pool), 100);
  }
});

/* Product, checkout and cart */
const sheetProductTitle = document.querySelector("#sheetProductTitle");
const sheetProductImage = document.querySelector("#sheetProductImage");
const sheetProductState = document.querySelector("#sheetProductState");
const sheetProductMeta = document.querySelector("#sheetProductMeta");
const sheetProductPrice = document.querySelector("#sheetProductPrice");
const sheetCartButton = document.querySelector("[data-sheet-cart]");
const sheetBuyButton = document.querySelector("[data-sheet-buy]");
const cartList = document.querySelector(".cart-list");
const cartTotal = document.querySelector("#cartTotal");
const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
const checkoutTotal = document.querySelector("#checkoutTotal");
const checkoutButton = document.querySelector("[data-open-checkout]");
const cartManageButton = document.querySelector("[data-cart-manage]");
const cartPage = document.querySelector("#page-cart");
let cartManaging = false;
const checkoutTitle = document.querySelector("#checkoutTitle");
const selectAllButton = document.querySelector(".select-all");
let currentProduct = null;
let checkoutContext = { mode: "cart", total: 0 };
let activeCartFilter = "全部";

function openProduct(card, trigger = card) {
  currentProduct = productFromCard(card);
  sheetProductTitle.textContent = currentProduct.name;
  sheetProductImage.src = currentProduct.image;
  sheetProductImage.alt = currentProduct.name;
  sheetProductState.textContent = `${currentProduct.state} · 官方授权`;
  sheetProductMeta.textContent = `${currentProduct.ip} · ${currentProduct.shipping}`;
  sheetProductPrice.textContent = `¥${currentProduct.price}`;
  const unavailable = currentProduct.state === "到货提醒";
  sheetCartButton.textContent = unavailable ? "订阅到货" : "加入购物车";
  sheetBuyButton.textContent = unavailable ? "暂未开售" : "立即购买";
  sheetBuyButton.disabled = unavailable;
  openDialog(productSheet, trigger);
}

productCards.forEach((card) => {
  card.addEventListener("click", () => openProduct(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct(card);
    }
  });
});

function cartItems() {
  return [...cartList.querySelectorAll(".cart-item")];
}

function updateCartBadge() {
  const quantity = cartItems().reduce((sum, item) => sum + Number(item.dataset.quantity), 0);
  document.querySelector(".bottom-item.has-badge b").textContent = String(quantity);
}

function applyCartFilter() {
  const items = cartItems();
  items.forEach((item) => (item.hidden = activeCartFilter !== "全部" && item.dataset.state !== activeCartFilter));
  const counts = { 全部: items.length, 现货: items.filter((item) => item.dataset.state === "现货").length, 预售: items.filter((item) => item.dataset.state === "预售").length };
  document.querySelectorAll("[data-cart-filter]").forEach((button) => (button.textContent = `${button.dataset.cartFilter} ${counts[button.dataset.cartFilter]}`));
}

function updateCart() {
  const items = cartItems();
  const selected = items.filter((item) => item.classList.contains("is-selected"));
  const selectedQuantity = selected.reduce((sum, item) => sum + Number(item.dataset.quantity), 0);
  const total = selected.reduce((sum, item) => sum + Number(item.dataset.price) * Number(item.dataset.quantity), 0);
  cartTotal.textContent = `¥${Number(total.toFixed(2))}`;
  checkoutButton.textContent = cartManaging
    ? `删除所选（${selected.length}种）`
    : `去结算（${selected.length}种 / ${selectedQuantity}件）`;
  checkoutButton.disabled = selected.length === 0;
  checkoutButton.classList.toggle("is-danger", cartManaging);
  const allSelected = items.length > 0 && selected.length === items.length;
  selectAllButton.classList.toggle("is-selected", allSelected);
  selectAllButton.setAttribute("aria-pressed", String(allSelected));
  selectAllButton.querySelector("i").textContent = allSelected ? "✓" : "";
  applyCartFilter();
  updateCartBadge();
}

function addProductToCart(product) {
  const existing = cartItems().find((item) => item.dataset.cartId === product.id);
  if (existing) {
    existing.dataset.quantity = String(Number(existing.dataset.quantity) + 1);
    existing.querySelector(".qty-control b").textContent = existing.dataset.quantity;
    existing.classList.add("is-selected");
  } else {
    const item = document.createElement("article");
    item.className = "cart-item is-selected";
    item.dataset.cartId = product.id;
    item.dataset.state = product.state === "预售" ? "预售" : "现货";
    item.dataset.price = String(product.price);
    item.dataset.quantity = "1";
    const stateClass = item.dataset.state === "预售" ? "presale-state" : "stock-state";
    item.innerHTML = `<button class="cart-check" type="button" aria-pressed="true" aria-label="选择${product.name}"></button><img src="${product.image}" alt="${product.name}"><div class="cart-item-info"><span class="cart-state ${stateClass}">${item.dataset.state}</span><h2>${product.name}</h2><p>${product.shipping}</p><strong>¥${product.price}</strong><div class="qty-control"><button type="button" data-qty-action="minus" aria-label="减少${product.name}数量">−</button><b>1</b><button type="button" data-qty-action="plus" aria-label="增加${product.name}数量">＋</button></div></div>`;
    cartList.prepend(item);
  }
  updateCart();
}

sheetCartButton.addEventListener("click", () => {
  if (!currentProduct) return;
  if (currentProduct.state === "到货提醒") {
    closeDialog();
    showToast("已订阅到货提醒");
    return;
  }
  addProductToCart(currentProduct);
  closeDialog();
  showToast(`${currentProduct.name} 已加入购物车`);
});

function prepareCheckout(total, mode, label, trigger = document.activeElement) {
  checkoutContext = { mode, total, label };
  checkoutTitle.textContent = mode === "cart" ? "确认购物车结算" : `确认购买 · ${label}`;
  checkoutSubtotal.textContent = `¥${Number(total.toFixed(2))}`;
  checkoutTotal.textContent = `¥${Number(total.toFixed(2))}`;
  openDialog(checkoutSheet, trigger);
}

sheetBuyButton.addEventListener("click", (event) => {
  if (!currentProduct || currentProduct.state === "到货提醒") return;
  prepareCheckout(currentProduct.price, "buy-now", currentProduct.name, event.currentTarget);
});

cartList.addEventListener("click", (event) => {
  const item = event.target.closest(".cart-item");
  if (!item) return;
  const check = event.target.closest(".cart-check");
  if (check) {
    const selected = !item.classList.contains("is-selected");
    item.classList.toggle("is-selected", selected);
    check.setAttribute("aria-pressed", String(selected));
    updateCart();
    return;
  }
  const quantityButton = event.target.closest("[data-qty-action]");
  if (quantityButton) {
    const next = Math.max(1, Number(item.dataset.quantity) + (quantityButton.dataset.qtyAction === "plus" ? 1 : -1));
    item.dataset.quantity = String(next);
    quantityButton.parentElement.querySelector("b").textContent = String(next);
    updateCart();
  }
});

document.querySelectorAll("[data-cart-filter]").forEach((button) => button.addEventListener("click", () => {
  activeCartFilter = button.dataset.cartFilter;
  button.parentElement.querySelectorAll("button").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  applyCartFilter();
  showToast(`已显示${button.dataset.cartFilter}商品`);
}));

selectAllButton.addEventListener("click", () => {
  const visibleItems = cartItems().filter((item) => !item.hidden);
  const next = visibleItems.some((item) => !item.classList.contains("is-selected"));
  visibleItems.forEach((item) => {
    item.classList.toggle("is-selected", next);
    item.querySelector(".cart-check").setAttribute("aria-pressed", String(next));
  });
  updateCart();
});

checkoutButton.addEventListener("click", (event) => {
  const selected = cartItems().filter((item) => item.classList.contains("is-selected"));
  if (!selected.length) return showToast("请先选择商品");
  if (cartManaging) {
    const removed = selected.length;
    selected.forEach((item) => item.remove());
    updateCart();
    showToast(`已删除 ${removed} 种商品`);
    return;
  }
  const total = selected.reduce((sum, item) => sum + Number(item.dataset.price) * Number(item.dataset.quantity), 0);
  const quantity = selected.reduce((sum, item) => sum + Number(item.dataset.quantity), 0);
  prepareCheckout(total, "cart", `${selected.length} 种 / ${quantity} 件商品`, event.currentTarget);
});

document.querySelector("[data-confirm-pay]").addEventListener("click", () => {
  closeDialog();
  showToast(`模拟订单已提交 · ¥${Number(checkoutContext.total.toFixed(2))}`);
});

cartManageButton.addEventListener("click", () => {
  cartManaging = !cartManaging;
  cartPage.classList.toggle("is-managing", cartManaging);
  cartManageButton.classList.toggle("is-managing", cartManaging);
  cartManageButton.textContent = cartManaging ? "完成" : "管理";
  if (cartManaging) {
    cartItems().forEach((item) => {
      item.classList.remove("is-selected");
      item.querySelector(".cart-check").setAttribute("aria-pressed", "false");
    });
  }
  updateCart();
  showToast(cartManaging ? "选择商品后可删除" : "已退出管理模式");
});

/* Pool detail */
const poolSheetTitle = document.querySelector("#poolSheetTitle");
const poolSheetMeta = document.querySelector("#poolSheetMeta");
const enterPoolButton = document.querySelector("[data-enter-pool]");
let currentPool = null;

function openPool(pool, trigger = pool) {
  currentPool = pool;
  poolSheetTitle.textContent = pool.dataset.pool;
  poolSheetMeta.textContent = `剩余 ${pool.dataset.remaining} 份 · ${pool.dataset.popularity} 人参与 · ${pool.dataset.poolType}`;
  enterPoolButton.textContent = pool.dataset.poolDestination === "draw" ? "进入对应抽卡机" : "模拟参与本赏池";
  openDialog(poolSheet, trigger);
}

document.querySelectorAll("[data-pool]").forEach((pool) => {
  pool.addEventListener("click", () => openPool(pool));
  if (pool.matches(".pool-card")) pool.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPool(pool);
    }
  });
});
enterPoolButton.addEventListener("click", () => {
  const destination = currentPool?.dataset.poolDestination;
  const poolName = currentPool?.dataset.pool || "赏池";
  closeDialog({ restoreFocus: false });
  if (destination) navigate(destination);
  else showToast(`已模拟参与「${poolName}」`);
});

/* Simulated draw */
const drawConfirmMeta = document.querySelector("#drawConfirmMeta");
const drawResultTitle = document.querySelector("#drawResultTitle");
const drawResultMeta = document.querySelector("#drawResultMeta");
let pendingDraw = null;
let simulatedPrizeCount = 0;

document.querySelectorAll("[data-draw-count]").forEach((button) => button.addEventListener("click", () => {
  const label = button.dataset.drawCount;
  const count = label.includes("整盒") ? 6 : Number(label.match(/\d+/)?.[0] || 1);
  pendingDraw = { label, count, price: Number(button.dataset.drawPrice), trigger: button };
  drawConfirmMeta.textContent = `${label} · ${count} 件模拟赏品 · 共 ¥${pendingDraw.price}`;
  openDialog(drawConfirmSheet, button);
}));

document.querySelector("[data-confirm-draw]").addEventListener("click", () => {
  if (!pendingDraw) return;
  const draw = pendingDraw;
  closeDialog({ restoreFocus: false });
  showToast("模拟支付已确认，正在开包…");
  window.setTimeout(() => {
    simulatedPrizeCount += draw.count;
    drawResultTitle.textContent = draw.count > 1 ? `模拟开出 ${draw.count} 件赏品！` : "模拟抽中了限定款！";
    drawResultMeta.textContent = `${draw.count} 件赏品已存入「我的赏品」 · 模拟金额 ¥${draw.price}`;
    openDialog(drawResult, draw.trigger);
  }, 520);
});

document.querySelector("[data-preview-card]").addEventListener("click", () => showToast("卡包内含 6 款，选择数量开始模拟抽取"));

/* Account detail */
const accountSheetTitle = document.querySelector("#accountSheetTitle");
const accountSheetList = document.querySelector("#accountSheetList");
const accountContent = {
  orders: [["炎柱纪念公仔", "待发货", "¥69"], ["柱集结限定摆件", "待收货", "¥129"], ["蜜璃亚克力立牌", "待付款", "¥39"]],
  records: [["炎柱纪念卡包", "抽 1 包", "今日 18:24"], ["柱集合赏", "一番赏", "昨日 21:08"]],
  coupons: [["新人满减券", "满 99 减 15", "7 天后到期"], ["包邮券", "全场可用", "30 天后到期"]],
  "after-sale": [["售后服务", "暂无进行中的售后", "需要帮助请联系在线客服"]],
  address: [["默认收货地址", "谷多多用户 138****8266", "上海市徐汇区"]],
  support: [["在线客服", "工作日 09:00–21:00", "当前可咨询"]],
  invite: [["邀请有礼", "每邀请 1 位好友得 20 积分", "分享码 GUJI2026"]],
  privacy: [["隐私设置", "个性化推荐已开启", "可在正式 App 中管理"]],
  about: [["谷多多 Preview", "完整静态交互原型", "Version 2.0"]],
};

function openAccountView(view, filter = "", trigger = document.activeElement) {
  const titles = { orders: "我的订单", prizes: "我的赏品", records: "抽赏记录", coupons: "我的优惠券", "after-sale": "售后服务", address: "收货地址", support: "客服中心", invite: "邀请有礼", privacy: "隐私设置", about: "关于我们" };
  accountSheetTitle.textContent = filter || titles[view] || "个人中心";
  let rows;
  if (view === "prizes") rows = [["炼狱杏寿郎 · 燃魂款", "已入赏品柜", `基础 1 件${simulatedPrizeCount ? ` + 本次模拟 ${simulatedPrizeCount} 件` : ""}`], ["蜜璃亚克力立牌", "待收货", "1 件"]];
  else rows = accountContent[view] || [["功能说明", "此入口为静态原型", "暂无更多数据"]];
  if (view === "orders" && filter) rows = rows.filter((row) => row[1] === filter);
  accountSheetList.innerHTML = rows.map((row) => `<article><strong>${row[0]}</strong><span>${row[1]}</span><small>${row[2]}</small></article>`).join("");
  openDialog(accountSheet, trigger);
}

document.querySelectorAll("[data-account-view]").forEach((button) => button.addEventListener("click", () => openAccountView(button.dataset.accountView, button.dataset.accountFilter || "", button)));

const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }),
  { root: scrollView, threshold: 0.08 },
);
document.querySelectorAll(".reveal").forEach((section) => revealObserver.observe(section));

window.addEventListener("hashchange", () => routeFromHash());
window.addEventListener("load", () => {
  routeFromHash({ instant: true });
  applyHomeFilters({ announce: false });
  applyPoolFilters({ announce: false });
  updateCart();
  document.querySelectorAll(".reveal").forEach((section, index) => {
    if (section.getBoundingClientRect().top < window.innerHeight) window.setTimeout(() => section.classList.add("is-visible"), index * 70);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeDialog) {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== "Tab" || !activeDialog) return;
  const focusable = focusableWithin(activeDialog);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
