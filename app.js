const scrollView = document.querySelector("#scrollView");
const toast = document.querySelector("#toast");
const pages = [...document.querySelectorAll(".app-page")];
const bottomItems = [...document.querySelectorAll(".bottom-item")];
const pageNames = { home: "首页", pool: "赏池", draw: "抽卡", cart: "购物车", mine: "我的" };
const scrollPositions = new Map();
let currentPage = "home";
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function switchPage(page, options = {}) {
  if (!pageNames[page]) return;
  scrollPositions.set(currentPage, scrollView.scrollTop);
  currentPage = page;
  pages.forEach((item) => item.classList.toggle("is-active", item.dataset.page === page));
  bottomItems.forEach((item) => {
    const selected = item.dataset.pageTarget === page;
    item.classList.toggle("is-active", selected);
    if (selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  const nextTop = options.reset === false ? scrollPositions.get(page) || 0 : 0;
  scrollView.scrollTo({ top: nextTop, behavior: options.instant ? "auto" : "smooth" });
  document.title = `谷多多 · ${pageNames[page]}`;
  window.history.replaceState(null, "", `#${page}`);
  closeOverlay();
  closeSheets();
}

function scrollToTarget(id) {
  if (currentPage !== "home") switchPage("home", { instant: true });
  window.requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    const top = id === "top" ? 0 : target.offsetTop - 160;
    scrollView.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
}

document.querySelectorAll("[data-toast]").forEach((control) => {
  control.addEventListener("click", (event) => {
    if (control.closest("[data-product]") && control !== control.closest("[data-product]")) event.stopPropagation();
    showToast(control.dataset.toast);
  });
});

document.querySelectorAll("[data-target]").forEach((control) => {
  if (control.matches(".bottom-item")) return;
  control.addEventListener("click", () => scrollToTarget(control.dataset.target));
});

document.querySelectorAll("[data-go-page]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.stopPropagation();
    switchPage(control.dataset.goPage);
  });
});

bottomItems.forEach((item) => {
  item.addEventListener("click", () => switchPage(item.dataset.pageTarget, { reset: item.dataset.pageTarget === currentPage }));
});

document.querySelectorAll(".channel-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".channel-tab").forEach((item) => {
      item.classList.toggle("is-active", item === tab);
      item.removeAttribute("aria-current");
    });
    tab.setAttribute("aria-current", "page");
    showToast(`已切换到「${tab.textContent.trim()}」`);
  });
});

document.querySelectorAll(".ip-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    document.querySelectorAll(".ip-filter").forEach((item) => {
      const selected = item === filter;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    showToast(`当前筛选：${filter.dataset.ip}`);
  });
});

document.querySelectorAll(".segmented-tabs, .mini-filter, .cart-tabs").forEach((group) => {
  group.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        if (item.getAttribute("role") === "tab") item.setAttribute("aria-selected", String(item === button));
      });
      showToast(`已切换：${button.textContent.trim()}`);
    });
  });
});

const searchOverlay = document.querySelector("#searchOverlay");
const globalSearchInput = document.querySelector("#globalSearchInput");

function openSearch(query = "") {
  searchOverlay.classList.add("is-open");
  searchOverlay.setAttribute("aria-hidden", "false");
  globalSearchInput.value = query;
  window.setTimeout(() => globalSearchInput.focus(), 240);
}

function closeOverlay() {
  searchOverlay.classList.remove("is-open");
  searchOverlay.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-open-search]").forEach((button) => button.addEventListener("click", () => openSearch()));
document.querySelectorAll("[data-close-overlay]").forEach((button) => button.addEventListener("click", closeOverlay));

const homeSearch = document.querySelector("#searchForm");
const homeSearchInput = document.querySelector("#searchInput");
homeSearch.addEventListener("submit", (event) => {
  event.preventDefault();
  openSearch(homeSearchInput.value.trim());
});
homeSearchInput.addEventListener("focus", () => openSearch(homeSearchInput.value.trim()));

document.querySelector("#globalSearchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = globalSearchInput.value.trim();
  if (!query) return showToast("请输入 IP、角色或商品");
  closeOverlay();
  switchPage("home", { instant: true });
  window.setTimeout(() => scrollToTarget("products"), 80);
  showToast(`找到与「${query}」相关的推荐`);
});

document.querySelectorAll(".search-content button").forEach((button) => {
  if (button.hasAttribute("data-clear-history")) return;
  button.addEventListener("click", () => {
    const query = button.querySelector("span")?.textContent || button.textContent;
    globalSearchInput.value = query.trim();
    showToast(`已填入「${query.trim()}」`);
  });
});

document.querySelector("[data-clear-history]").addEventListener("click", () => {
  document.querySelector("#searchHistory").innerHTML = "<span class='empty-history'>暂无搜索记录</span>";
  showToast("搜索记录已清空");
});

const sheetBackdrop = document.querySelector("#sheetBackdrop");
const productSheet = document.querySelector("#productSheet");
const checkoutSheet = document.querySelector("#checkoutSheet");
const sheetProductTitle = document.querySelector("#sheetProductTitle");
const sheetProductImage = document.querySelector("#sheetProductImage");

function openSheet(sheet) {
  closeSheets();
  sheetBackdrop.classList.add("is-open");
  sheetBackdrop.setAttribute("aria-hidden", "false");
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
}

function closeSheets() {
  sheetBackdrop.classList.remove("is-open");
  sheetBackdrop.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".bottom-sheet").forEach((sheet) => {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
  });
}

function openProduct(card) {
  const image = card.querySelector("img");
  sheetProductTitle.textContent = card.dataset.product;
  if (image) sheetProductImage.src = image.src;
  sheetProductImage.alt = card.dataset.product;
  openSheet(productSheet);
}

document.querySelectorAll("[data-product]").forEach((card) => {
  card.addEventListener("click", () => openProduct(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct(card);
    }
  });
});

document.querySelectorAll("[data-close-sheet]").forEach((button) => button.addEventListener("click", closeSheets));
sheetBackdrop.addEventListener("click", () => {
  closeSheets();
  closeDrawResult();
});

document.querySelector("[data-sheet-cart]").addEventListener("click", () => {
  closeSheets();
  showToast("已加入购物车");
  const badge = document.querySelector(".bottom-item.has-badge b");
  badge.textContent = String(Number(badge.textContent) + 1);
});
document.querySelector("[data-sheet-buy]").addEventListener("click", () => openSheet(checkoutSheet));

const cartItems = [...document.querySelectorAll(".cart-item")];
const cartTotal = document.querySelector("#cartTotal");
const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
const checkoutTotal = document.querySelector("#checkoutTotal");
const checkoutButton = document.querySelector("[data-open-checkout]");
const selectAllButton = document.querySelector(".select-all");

function updateCart() {
  const selected = cartItems.filter((item) => item.classList.contains("is-selected"));
  const total = selected.reduce((sum, item) => sum + Number(item.dataset.price) * Number(item.dataset.quantity), 0);
  cartTotal.textContent = `¥${total}`;
  checkoutSubtotal.textContent = `¥${total}`;
  checkoutTotal.textContent = `¥${total}`;
  checkoutButton.textContent = `去结算 (${selected.length})`;
  const allSelected = selected.length === cartItems.length;
  selectAllButton.classList.toggle("is-selected", allSelected);
  selectAllButton.setAttribute("aria-pressed", String(allSelected));
}

document.querySelectorAll(".cart-check").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".cart-item");
    const selected = !item.classList.contains("is-selected");
    item.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "✓" : "";
    updateCart();
  });
});

document.querySelectorAll("[data-qty-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".cart-item");
    const next = Math.max(1, Number(item.dataset.quantity) + (button.dataset.qtyAction === "plus" ? 1 : -1));
    item.dataset.quantity = String(next);
    button.parentElement.querySelector("b").textContent = String(next);
    updateCart();
  });
});

selectAllButton.addEventListener("click", () => {
  const next = !selectAllButton.classList.contains("is-selected");
  cartItems.forEach((item) => {
    item.classList.toggle("is-selected", next);
    const check = item.querySelector(".cart-check");
    check.setAttribute("aria-pressed", String(next));
    check.textContent = next ? "✓" : "";
  });
  updateCart();
});

checkoutButton.addEventListener("click", () => {
  if (!cartItems.some((item) => item.classList.contains("is-selected"))) return showToast("请先选择商品");
  openSheet(checkoutSheet);
});

document.querySelector("[data-confirm-pay]").addEventListener("click", () => {
  closeSheets();
  showToast("静态预览：订单已提交成功");
});

document.querySelector("[data-cart-manage]").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("is-managing");
  event.currentTarget.textContent = event.currentTarget.classList.contains("is-managing") ? "完成" : "管理";
  showToast(event.currentTarget.textContent === "完成" ? "可选择商品进行管理" : "已退出管理模式");
});

const drawResult = document.querySelector("#drawResult");
function openDrawResult(label, price) {
  showToast(`正在开启：${label} · ¥${price}`);
  window.setTimeout(() => {
    sheetBackdrop.classList.add("is-open");
    drawResult.classList.add("is-open");
    drawResult.setAttribute("aria-hidden", "false");
  }, 650);
}

function closeDrawResult() {
  drawResult.classList.remove("is-open");
  drawResult.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".bottom-sheet.is-open")) sheetBackdrop.classList.remove("is-open");
}

document.querySelectorAll("[data-draw-count]").forEach((button) => button.addEventListener("click", () => openDrawResult(button.dataset.drawCount, button.dataset.drawPrice)));
document.querySelector("[data-close-result]").addEventListener("click", () => {
  closeDrawResult();
  showToast("赏品已存入我的赏品");
});

document.querySelector("[data-preview-card]").addEventListener("click", () => showToast("卡包内含 6 款，点击数量开始抽卡"));
document.querySelector("[data-open-orders]").addEventListener("click", () => showToast("订单中心：3 个订单状态已载入"));

const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }),
  { root: scrollView, threshold: 0.08 }
);
document.querySelectorAll(".reveal").forEach((section) => revealObserver.observe(section));

window.addEventListener("load", () => {
  document.querySelectorAll(".reveal").forEach((section, index) => {
    if (section.getBoundingClientRect().top < window.innerHeight) window.setTimeout(() => section.classList.add("is-visible"), index * 70);
  });
  updateCart();
  const initialPage = window.location.hash.slice(1);
  if (pageNames[initialPage] && initialPage !== "home") switchPage(initialPage, { instant: true });
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeOverlay();
  closeSheets();
  closeDrawResult();
});
