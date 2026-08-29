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
  if (activeDialog) closeDialog({ restoreFocus: false, force: true, updateHistory: false });
  if (poolDetailOpen) closePoolDetail({ restoreFocus: false, updateHistory: false });
  if (productDetailOpen) {
    productReturnSearch = "";
    closeProductDetail({ restoreFocus: false, updateHistory: false });
  }
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
  if (typeof drawPaymentPending !== "undefined" && drawPaymentPending) {
    showToast("支付处理中，请稍候");
    return;
  }
  const destination = page === "draw" ? `draw/${typeof activeDrawPackId !== "undefined" ? activeDrawPackId : "flame-pack"}` : page;
  if (currentPage === page) {
    const currentRoute = window.location.hash.slice(1);
    if (currentRoute === destination) activatePage(page, { reset: options.reset !== false });
    else window.location.hash = destination;
    return;
  }
  window.location.hash = destination;
}

function parseAppRoute() {
  const [page = "home", id = ""] = window.location.hash.slice(1).split("/");
  if (page === "pool" && id && poolById?.has(id)) return { page: "pool", poolId: id };
  if (page === "draw") return { page: "draw", packId: drawPackById?.has(id) ? id : "flame-pack" };
  return { page: pageNames[page] ? page : "home" };
}

function routeFromHash(options = {}) {
  const route = parseAppRoute();
  activatePage(route.page, options);
  if (route.poolId) openPool(route.poolId, null, { fromRoute: true });
  if (route.packId) renderDrawPack(route.packId, { updateRoute: false });
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

const checkinControls = [...document.querySelectorAll("[data-checkin]")];
let checkedInToday = false;

function updateCheckinState() {
  checkinControls.forEach((control) => {
    control.classList.toggle("is-checked", checkedInToday);
    control.disabled = checkedInToday;
    control.setAttribute("aria-label", checkedInToday ? "今日已签到" : "每日签到");
    const label = control.querySelector("span") || control;
    if (label === control) control.textContent = checkedInToday ? "今日已签" : "每日签到";
    else label.textContent = checkedInToday ? "今日已签" : "每日签到";
  });
}

checkinControls.forEach((control) => control.addEventListener("click", () => {
  if (checkedInToday) return;
  checkedInToday = true;
  updateCheckinState();
  showToast("签到成功，积分 +5");
}));

document.querySelector(".brand-button")?.addEventListener("click", () => {
  if (currentPage === "home") scrollToTarget("top");
  else navigate("home", { reset: true });
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

const productProfiles = [
  { stock: 86, sold: 286, material: "马口铁、闪粉覆膜", size: "直径约 75 mm", package: "独立卡装", description: "炎柱咖啡主题纪念徽章，采用亮面闪粉工艺，适合角色收藏与痛包搭配。" },
  { stock: 42, sold: 184, material: "高透亚克力、彩印", size: "约 70 × 100 mm", package: "防刮膜＋独立纸盒", description: "香奈乎莓果主题亚克力立牌，以角色与饮品组合造型呈现，可直接桌面陈列。" },
  { stock: 64, sold: 521, material: "高透亚克力、彩印", size: "高约 135 mm", package: "底座＋主体保护袋", description: "炎柱果饮主题亚克力立牌，包含角色主体与饮品背景，适合桌面展示。" },
  { stock: 120, sold: 238, material: "黑色高透亚克力", size: "高约 150 mm", package: "底座＋主体保护袋", description: "罗小黑黑金系列预售立牌，采用半透叠色与金属质感印刷。" },
  { stock: 126, sold: 97, material: "PET 胶片、局部光油", size: "约 90 × 55 mm", package: "独立防潮袋", description: "纸房子胶片风收藏卡，逆光可呈现通透画面层次。" },
  { stock: 72, sold: 166, material: "锌合金、烤漆", size: "主体约 45 mm", package: "独立吊卡包装", description: "夜行主题金属挂件，适合包袋装饰或角色收藏。" },
  { stock: 0, sold: 612, material: "马口铁、亮膜", size: "直径约 58 mm", package: "独立卡装", description: "水柱果饮主题纪念徽章，补货时间待官方确认。" },
  { stock: 38, sold: 203, material: "高透亚克力", size: "高约 140 mm", package: "主体＋底座独立保护", description: "恋柱果饮主题预售立牌，支持与同期预售商品合并发货。" },
];

function productFromCard(card, index = productCards.indexOf(card)) {
  const profile = productProfiles[index] || productProfiles[0];
  const unit = card.dataset.kind === "单领" ? "件" : "抽";
  const directProduct = unit === "件";
  const basePrice = Number(card.dataset.price);
  const options = directProduct
    ? [
        { id: "standard", label: "标准款", detail: "官方标准包装", price: basePrice, stock: profile.stock },
        { id: "collector", label: "收藏包装", detail: "加厚保护盒 +¥6", price: basePrice + 6, stock: Math.max(0, Math.min(profile.stock, 24)) },
      ]
    : [
        { id: "single", label: "单包随机款", detail: "每包随机 1 款", price: basePrice, stock: profile.stock },
        { id: "triple", label: "三包组合", detail: "三包组合立减 ¥2", price: Number((basePrice * 3 - 2).toFixed(1)), stock: Math.floor(profile.stock / 3) },
      ];
  return {
    id: `product-${index}`,
    name: card.dataset.product,
    ip: card.dataset.ip,
    kind: card.dataset.kind,
    state: card.dataset.state,
    price: basePrice,
    unit,
    shipping: card.dataset.shipping,
    image: card.querySelector("img")?.src || "",
    stock: profile.stock,
    sold: profile.sold,
    material: profile.material,
    size: profile.size,
    package: profile.package,
    description: profile.description,
    options,
    maxQty: Math.max(1, Math.min(6, profile.stock || 1)),
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

function selectHomeIp(ip) {
  activeHomeIp = ip;
  document.querySelectorAll(".ip-filter").forEach((item) => {
    const selected = item.dataset.ip === ip;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
}

document.querySelector("[data-weekly-feature]")?.addEventListener("click", () => {
  setChannelState("推荐");
  selectHomeIp("鬼灭之刃");
  applyHomeFilters({ announce: false });
  scrollToTarget("products");
  showToast("已进入义勇夜巡专题 · 5 件同系列商品");
});

const rankingSection = document.querySelector(".ranking-section");
const rankingToggle = document.querySelector("[data-ranking-all]");
rankingToggle?.addEventListener("click", () => {
  const expanded = !rankingSection.classList.contains("is-expanded");
  rankingSection.classList.toggle("is-expanded", expanded);
  rankingToggle.setAttribute("aria-expanded", String(expanded));
  rankingToggle.querySelector("span").textContent = expanded ? "收起榜单" : "查看全部";
  showToast(expanded ? "已展开完整角色榜" : "已收起角色榜");
});

document.querySelectorAll("[data-rank-ip]").forEach((card) => card.addEventListener("click", () => {
  setChannelState("推荐");
  selectHomeIp(card.dataset.rankIp);
  applyHomeFilters({ announce: false });
  scrollToTarget("products");
  showToast(`已展示 ${card.dataset.rankName} 的同 IP 商品`);
}));

let recommendationRound = 0;
document.querySelector("[data-shuffle-products]")?.addEventListener("click", () => {
  recommendationRound = (recommendationRound + 3) % productCards.length;
  const reordered = [...productCards.slice(recommendationRound), ...productCards.slice(0, recommendationRound)];
  const grid = document.querySelector(".product-grid");
  reordered.forEach((card) => grid.append(card));
  showToast("已更新推荐顺序");
});

/* Pool filters and detail */
function createPoolBoxes(remainingTotals, prizeTotals) {
  const total = prizeTotals.reduce((sum, value) => sum + value, 0);
  return remainingTotals.map((remaining, index) => {
    const raw = prizeTotals.map((tierTotal) => (remaining * tierTotal) / total);
    const counts = raw.map((value) => Math.floor(value));
    let unassigned = remaining - counts.reduce((sum, value) => sum + value, 0);
    raw
      .map((value, tierIndex) => ({ tierIndex, fraction: value - Math.floor(value) }))
      .sort((a, b) => b.fraction - a.fraction)
      .forEach(({ tierIndex }) => {
        if (unassigned > 0 && counts[tierIndex] < prizeTotals[tierIndex]) {
          counts[tierIndex] += 1;
          unassigned -= 1;
        }
      });
    return { number: index + 1, remaining, total, counts, lastRemaining: remaining > 0 ? 1 : 0 };
  });
}

const poolOfferConfiguration = [
  { id: "one", label: "1抽", count: 1, discount: 0, badge: "轻松试手" },
  { id: "three", label: "3抽", count: 3, discount: 3, badge: "立减 ¥3" },
  { id: "five", label: "5抽", count: 5, discount: 8, badge: "立减 ¥8" },
  { id: "all", label: "全收", count: "remaining", discountRate: 0.08, badge: "当前箱 92 折" },
];

const poolCatalog = [
  {
    id: "pillar-collection", title: "鬼灭之刃 · 柱集合赏", ip: "鬼灭之刃", type: "一番赏", image: "./assets/quick-pool.png",
    price: 39, popularity: 286, badge: "本周热池", currentBox: 3, linkedPackId: "flame-pack", probabilityUpdated: "今天 18:30",
    offers: poolOfferConfiguration,
    prizes: [
      { tier: "A赏", name: "柱集合限定亚克力摆件", image: "./assets/product-03.png", total: 2 },
      { tier: "B赏", name: "角色果饮徽章套组", image: "./assets/product-01.png", total: 18 },
      { tier: "C赏", name: "鎹鸦主题立牌", image: "./assets/product-08.png", total: 30 },
      { tier: "D赏", name: "柱集合收藏卡", image: "./assets/product-04.png", total: 46 },
    ],
    lastPrize: { tier: "LAST赏", name: "炎柱特别色大立牌", image: "./assets/hero-rengoku.png", total: 1 },
    boxes: createPoolBoxes([96, 75, 42, 18, 96, 81], [2, 18, 30, 46]),
  },
  {
    id: "galaxy-journey", title: "盗墓笔记 · 星河旅程", ip: "盗墓笔记", type: "一番赏", image: "./assets/product-daomu.svg",
    price: 45, popularity: 198, badge: "即将结束", currentBox: 4, linkedPackId: "galaxy-pack", probabilityUpdated: "今天 18:26",
    offers: poolOfferConfiguration,
    prizes: [
      { tier: "A赏", name: "星河旅程场景摆件", image: "./assets/product-daomu.svg", total: 2 },
      { tier: "B赏", name: "主角团收藏立牌", image: "./assets/product-06.png", total: 14 },
      { tier: "C赏", name: "旅程徽章", image: "./assets/product-07.png", total: 24 },
      { tier: "D赏", name: "星轨收藏卡", image: "./assets/product-daomu.svg", total: 40 },
    ],
    lastPrize: { tier: "LAST赏", name: "终点站限定灯牌", image: "./assets/product-daomu.svg", total: 1 },
    boxes: createPoolBoxes([80, 59, 34, 12], [2, 14, 24, 40]),
  },
  {
    id: "film-archive", title: "纸房子 · 胶片收藏赏", ip: "纸房子", type: "主题赏", image: "./assets/product-paperhouse.svg",
    price: 29, popularity: 92, badge: "主题新赏", currentBox: 2, linkedPackId: "film-pack", probabilityUpdated: "今天 18:21",
    offers: poolOfferConfiguration,
    prizes: [
      { tier: "A赏", name: "红衣人胶片灯箱", image: "./assets/product-paperhouse.svg", total: 2 },
      { tier: "B赏", name: "角色胶片立牌", image: "./assets/product-05.png", total: 16 },
      { tier: "C赏", name: "城市计划徽章", image: "./assets/product-02.png", total: 28 },
      { tier: "D赏", name: "经典台词票根卡", image: "./assets/product-paperhouse.svg", total: 44 },
    ],
    lastPrize: { tier: "LAST赏", name: "教授计划书收藏框", image: "./assets/product-paperhouse.svg", total: 1 },
    boxes: createPoolBoxes([90, 66, 33, 9, 90], [2, 16, 28, 44]),
  },
  {
    id: "healing-forest", title: "罗小黑 · 治愈森林赏", ip: "罗小黑战记", type: "主题赏", image: "./assets/product-luoxiaohei.svg",
    price: 35, popularity: 121, badge: "余量紧张", currentBox: 3, linkedPackId: "healing-pack", probabilityUpdated: "今天 18:18",
    offers: poolOfferConfiguration,
    prizes: [
      { tier: "A赏", name: "治愈森林旋转摆件", image: "./assets/product-luoxiaohei.svg", total: 2 },
      { tier: "B赏", name: "无限与小黑立牌", image: "./assets/product-08.png", total: 12 },
      { tier: "C赏", name: "妖灵会馆徽章", image: "./assets/product-06.png", total: 22 },
      { tier: "D赏", name: "森林日常收藏卡", image: "./assets/product-luoxiaohei.svg", total: 36 },
    ],
    lastPrize: { tier: "LAST赏", name: "小黑入梦夜灯", image: "./assets/product-luoxiaohei.svg", total: 1 },
    boxes: createPoolBoxes([72, 48, 18, 72], [2, 12, 22, 36]),
  },
];

const drawPackCatalog = [
  {
    id: "flame-pack", name: "炎柱纪念卡包", ip: "鬼灭之刃", image: "./assets/draw-pack.png", batchRemaining: 48, batchTotal: 72, updatedAt: "18:30", unitPrice: 20,
    offers: [{ id: "one", label: "1包", count: 1, price: 20, badge: "轻松试手" }, { id: "three", label: "3包", count: 3, price: 58, badge: "省 ¥2" }, { id: "box", label: "整盒", count: 6, price: 116, badge: "省 ¥4" }],
    catalog: [
      { name: "炼狱杏寿郎 · 果饮徽章", rarity: "稀有", image: "./assets/product-01.png", weight: 8 },
      { name: "富冈义勇 · 果饮徽章", rarity: "闪卡", image: "./assets/product-07.png", weight: 14 },
      { name: "甘露寺蜜璃 · 亚克力立牌", rarity: "闪卡", image: "./assets/product-08.png", weight: 18 },
      { name: "灶门祢豆子 · 果饮徽章", rarity: "常规", image: "./assets/product-04.png", weight: 20 },
      { name: "伊黑小芭内 · 果饮徽章", rarity: "常规", image: "./assets/product-06.png", weight: 20 },
      { name: "炎柱 · 果饮亚克力立牌", rarity: "常规", image: "./assets/product-03.png", weight: 20 },
    ],
  },
  {
    id: "film-pack", name: "胶片收藏卡包", ip: "纸房子", image: "./assets/product-paperhouse.svg", batchRemaining: 35, batchTotal: 60, updatedAt: "18:26", unitPrice: 18,
    offers: [{ id: "one", label: "1包", count: 1, price: 18, badge: "单包体验" }, { id: "three", label: "3包", count: 3, price: 52, badge: "省 ¥2" }, { id: "box", label: "整盒", count: 6, price: 102, badge: "省 ¥6" }],
    catalog: [
      { name: "教授 · 金边胶片卡", rarity: "稀有", image: "./assets/product-paperhouse.svg", weight: 10 },
      { name: "东京 · 角色胶片卡", rarity: "闪卡", image: "./assets/product-05.png", weight: 20 },
      { name: "红衣人 · 行动胶片卡", rarity: "常规", image: "./assets/product-02.png", weight: 35 },
      { name: "城市计划 · 票根卡", rarity: "常规", image: "./assets/product-paperhouse.svg", weight: 35 },
    ],
  },
  {
    id: "galaxy-pack", name: "星河旅程卡包", ip: "盗墓笔记", image: "./assets/product-daomu.svg", batchRemaining: 18, batchTotal: 48, updatedAt: "18:21", unitPrice: 22,
    offers: [{ id: "one", label: "1包", count: 1, price: 22, badge: "单包体验" }, { id: "three", label: "3包", count: 3, price: 64, badge: "省 ¥2" }, { id: "box", label: "整盒", count: 6, price: 126, badge: "省 ¥6" }],
    catalog: [
      { name: "星河终点 · 镭射卡", rarity: "稀有", image: "./assets/product-daomu.svg", weight: 8 },
      { name: "主角团 · 夜光卡", rarity: "闪卡", image: "./assets/product-06.png", weight: 22 },
      { name: "旅程札记 · 收藏卡", rarity: "常规", image: "./assets/product-07.png", weight: 35 },
      { name: "星轨地图 · 收藏卡", rarity: "常规", image: "./assets/product-daomu.svg", weight: 35 },
    ],
  },
  {
    id: "healing-pack", name: "治愈森林卡包", ip: "罗小黑战记", image: "./assets/product-luoxiaohei.svg", batchRemaining: 54, batchTotal: 72, updatedAt: "18:18", unitPrice: 19,
    offers: [{ id: "one", label: "1包", count: 1, price: 19, badge: "单包体验" }, { id: "three", label: "3包", count: 3, price: 55, badge: "省 ¥2" }, { id: "box", label: "整盒", count: 6, price: 108, badge: "省 ¥6" }],
    catalog: [
      { name: "小黑 · 月夜闪卡", rarity: "稀有", image: "./assets/product-luoxiaohei.svg", weight: 10 },
      { name: "无限 · 旅途卡", rarity: "闪卡", image: "./assets/product-08.png", weight: 20 },
      { name: "妖灵会馆 · 合影卡", rarity: "常规", image: "./assets/product-06.png", weight: 35 },
      { name: "森林日常 · 收藏卡", rarity: "常规", image: "./assets/product-luoxiaohei.svg", weight: 35 },
    ],
  },
];

const demoTransactionStorageKey = "gdd-pool-draw-state-v2";

function loadDemoTransactionState() {
  try {
    const value = JSON.parse(window.localStorage.getItem(demoTransactionStorageKey) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

let demoTransactionState = loadDemoTransactionState();

function applyPersistedInventory(state = demoTransactionState, { poolId = "", packId = "" } = {}) {
  poolCatalog.forEach((pool) => {
    if (poolId && pool.id !== poolId) return;
    const storedPool = state.pools?.[pool.id];
    if (!storedPool) return;
    if (storedPool.probabilityUpdated) pool.probabilityUpdated = storedPool.probabilityUpdated;
    pool.boxes.forEach((box) => {
      const storedBox = storedPool.boxes?.[box.number];
      if (!storedBox || !Array.isArray(storedBox.counts) || storedBox.counts.length !== box.counts.length) return;
      const counts = storedBox.counts.map((value, index) => Math.max(0, Math.min(pool.prizes[index].total, Number(value) || 0)));
      box.counts = counts;
      box.remaining = counts.reduce((sum, value) => sum + value, 0);
      box.lastRemaining = box.remaining > 0 && storedBox.lastRemaining !== 0 ? 1 : 0;
    });
  });
  drawPackCatalog.forEach((pack) => {
    if (packId && pack.id !== packId) return;
    const storedPack = state.packs?.[pack.id];
    if (!storedPack) return;
    pack.batchRemaining = Math.max(0, Math.min(pack.batchTotal, Number(storedPack.remaining) || 0));
    if (storedPack.updatedAt) pack.updatedAt = storedPack.updatedAt;
  });
}

function syncPersistedInventory({ poolId = "", packId = "" } = {}) {
  const fresh = loadDemoTransactionState();
  if (fresh.pools || fresh.packs) {
    demoTransactionState = fresh;
    applyPersistedInventory(fresh, { poolId, packId });
  }
}

function currentClockTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function persistDemoTransactionState() {
  const state = {
    version: 2,
    pools: Object.fromEntries(poolCatalog.map((pool) => [pool.id, {
      probabilityUpdated: pool.probabilityUpdated,
      boxes: Object.fromEntries(pool.boxes.map((box) => [box.number, { counts: [...box.counts], lastRemaining: box.lastRemaining }])),
    }])),
    packs: Object.fromEntries(drawPackCatalog.map((pack) => [pack.id, { remaining: pack.batchRemaining, updatedAt: pack.updatedAt }])),
    wonPrizes: wonPrizes.slice(0, 120).map(({ name, rarity, image, tier }) => ({ name, rarity, image, tier })),
    records: accountContent.records.slice(0, 120),
  };
  demoTransactionState = state;
  try {
    window.localStorage.setItem(demoTransactionStorageKey, JSON.stringify(state));
  } catch {
    showToast("本次结果已保留在当前页面，请勿立即关闭");
  }
}

applyPersistedInventory();

const poolById = new Map(poolCatalog.map((pool) => [pool.id, pool]));
const drawPackById = new Map(drawPackCatalog.map((pack) => [pack.id, pack]));
const selectedPoolBoxes = new Map(poolCatalog.map((pool) => [pool.id, pool.currentBox]));
const poolGrid = document.querySelector("#poolGrid");
const poolFeature = document.querySelector("#poolFeature");
const poolEmpty = document.querySelector("#poolEmpty");
const hotPoolTitle = document.querySelector("#hotPoolTitle");
let activePoolType = "综合";
let activePoolIp = "全部";
let activePoolSort = "最新";

function selectedPoolBox(pool) {
  return pool.boxes[(selectedPoolBoxes.get(pool.id) || pool.currentBox) - 1];
}

function poolOfferQuote(pool, offerId, box = selectedPoolBox(pool)) {
  const configuration = pool.offers.find((offer) => offer.id === offerId) || pool.offers[0];
  const count = configuration.count === "remaining" ? box.remaining : configuration.count;
  const subtotal = count * pool.price;
  const discount = configuration.discountRate
    ? Math.round(subtotal * configuration.discountRate)
    : Math.min(subtotal, configuration.discount || 0);
  return {
    ...configuration,
    count,
    subtotal,
    discount,
    price: Math.max(0, subtotal - discount),
    available: count > 0 && count <= box.remaining,
  };
}

function poolMatchesFilters(pool) {
  const box = selectedPoolBox(pool);
  const typeMatch = activePoolType === "综合" || pool.type === activePoolType || (activePoolType === "即将结束" && box.remaining <= 20);
  return typeMatch && (activePoolIp === "全部" || pool.ip === activePoolIp);
}

function renderPoolFeature(pool) {
  const box = selectedPoolBox(pool);
  const grandRemaining = (box.counts[0] || 0) + box.lastRemaining;
  poolFeature.dataset.poolId = pool.id;
  document.querySelector("#poolFeatureBadge").textContent = pool.badge;
  document.querySelector("#poolFeatureTitle").textContent = pool.title;
  document.querySelector("#poolFeatureMeta").textContent = `¥${pool.price}/抽 · 大奖尚余 ${grandRemaining} 件 · ${box.lastRemaining ? `距 LAST ${box.remaining} 抽` : "LAST 已出"}`;
  const image = document.querySelector("#poolFeatureImage");
  image.src = pool.prizes[0].image;
  image.alt = `${pool.title}${pool.prizes[0].name}`;
}

function renderPoolCard(pool) {
  const box = selectedPoolBox(pool);
  const progress = Math.round((box.remaining / box.total) * 100);
  const grandRemaining = (box.counts[0] || 0) + box.lastRemaining;
  return `<button class="pool-card" type="button" data-pool-id="${pool.id}" aria-label="查看${pool.title}第${box.number}箱">
    <span class="pool-card-media"><img class="pool-card-a-prize" src="${pool.prizes[0].image}" alt="" /><img class="pool-card-last-prize" src="${pool.lastPrize.image}" alt="" /><b>${pool.type}</b><em>${box.lastRemaining ? "LAST 未出" : "LAST 已出"}</em></span>
    <span class="pool-card-copy"><strong>${pool.title}</strong><span><b>¥${pool.price}<small>/抽</small></b><small>第 ${box.number}/${pool.boxes.length} 箱</small></span><span class="pool-card-value">大奖尚余 ${grandRemaining} 件 · ${box.lastRemaining ? `距 LAST ${box.remaining} 抽` : "LAST 已出"}</span><span class="pool-card-stock">剩余 ${box.remaining}/${box.total}</span></span>
    <span class="pool-card-progress" role="progressbar" aria-label="${pool.title}剩余" aria-valuemin="0" aria-valuemax="${box.total}" aria-valuenow="${box.remaining}"><i style="width:${progress}%"></i></span>
  </button>`;
}

function applyPoolFilters({ announce = true } = {}) {
  const visible = poolCatalog.filter(poolMatchesFilters).sort((a, b) => {
    if (activePoolSort === "人气") return b.popularity - a.popularity;
    if (activePoolSort === "将结束") return selectedPoolBox(a).remaining - selectedPoolBox(b).remaining;
    return poolCatalog.indexOf(a) - poolCatalog.indexOf(b);
  });
  poolFeature.hidden = visible.length === 0;
  if (visible[0]) renderPoolFeature(visible[0]);
  poolGrid.innerHTML = visible.map(renderPoolCard).join("");
  hotPoolTitle.textContent = `当前可抽（${visible.length}）`;
  poolEmpty.hidden = visible.length !== 0;
  poolGrid.classList.toggle("is-single", visible.length === 1);
  if (announce) showToast(`已更新 ${visible.length} 个赏池`);
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
const poolDetailView = document.querySelector("#poolDetailView");
const productDetailView = document.querySelector("#productDetailView");
const skuSheet = document.querySelector("#skuSheet");
const checkoutSheet = document.querySelector("#checkoutSheet");
const orderSuccessSheet = document.querySelector("#orderSuccessSheet");
const drawConfirmSheet = document.querySelector("#drawConfirmSheet");
const accountSheet = document.querySelector("#accountSheet");
const drawResult = document.querySelector("#drawResult");
let activeDialog = null;
let lastDialogTrigger = null;
let poolDetailOpen = false;
let productDetailOpen = false;
let drawPaymentPending = false;
let drawOpeningActive = false;
let drawTransactionToken = 0;
let drawPaymentTimer = null;
let drawOpeningTimer = null;
let drawOpeningStageTimers = [];
let drawConfirmHistoryOpen = false;
let completedDrawAfterHistory = null;

function focusableWithin(element) {
  return [...element.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(
    (item) => !item.hidden && item.getClientRects().length,
  );
}

function setLayerInert(element, value) {
  if (value && element.contains(document.activeElement) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  element.inert = value;
  if (value) element.setAttribute("aria-hidden", "true");
  else element.removeAttribute("aria-hidden");
}

function setAppBackgroundInert(value) {
  setLayerInert(scrollView, value || poolDetailOpen || productDetailOpen);
  setLayerInert(bottomNav, value || poolDetailOpen || productDetailOpen);
  setLayerInert(poolDetailView, value || productDetailOpen);
  setLayerInert(productDetailView, value || poolDetailOpen);
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
  focusableWithin(dialog)[0]?.focus({ preventScroll: true });
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

function closeDialog({ restoreFocus = true, force = false, updateHistory = true } = {}) {
  if (!activeDialog) return;
  if (activeDialog === drawConfirmSheet && drawConfirmHistoryOpen && updateHistory) {
    cancelDrawTransaction({ clearOrder: true });
    window.history.back();
    return true;
  }
  if (!force && activeDialog === drawResult && drawOpeningActive) {
    showToast("正在揭晓，可点击跳过动画");
    return false;
  }
  const closing = activeDialog;
  const focusTarget = restoreFocus && lastDialogTrigger?.isConnected ? lastDialogTrigger : null;
  activeDialog = null;
  closing.classList.remove("is-open");
  sheetBackdrop.classList.remove("is-open");
  sheetBackdrop.setAttribute("aria-hidden", "true");
  if (closing.contains(document.activeElement) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  setAppBackgroundInert(false);
  focusTarget?.focus();
  closing.setAttribute("aria-hidden", "true");
  closing.hidden = true;
  lastDialogTrigger = null;
  if (closing === drawConfirmSheet) {
    drawConfirmHistoryOpen = false;
    cancelDrawTransaction({ clearOrder: true });
  }
  return true;
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
  const poolMatches = poolCatalog.filter((item) => normalize(`${item.title}${item.ip}${item.type}`).includes(needle));
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
    button.dataset.searchPool = item.id;
    button.innerHTML = `<img src="${item.image}" alt=""><span><strong>${item.title}</strong><small>${item.ip} · ${item.type}</small></span><b>赏池</b>`;
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
    const query = globalSearchInput.value;
    closeDialog({ restoreFocus: false });
    if (product) openProductDetail(product, button, { returnToSearch: query });
  } else if (button.dataset.searchPool) {
    const pool = poolById.get(button.dataset.searchPool);
    closeDialog({ restoreFocus: false });
    if (pool) openPool(pool.id, button);
  }
});

/* Product, checkout and cart */
const productDetailScroll = document.querySelector("#productDetailScroll");
const detailProductImage = document.querySelector("#detailProductImage");
const detailThumbOne = document.querySelector("#detailThumbOne");
const detailThumbTwo = document.querySelector("#detailThumbTwo");
const detailGalleryBadge = document.querySelector("#detailGalleryBadge");
const detailStateBadge = document.querySelector("#detailStateBadge");
const detailBrand = document.querySelector("#detailBrand");
const productDetailTitle = document.querySelector("#productDetailTitle");
const detailProductPrice = document.querySelector("#detailProductPrice");
const detailProductUnit = document.querySelector("#detailProductUnit");
const detailSales = document.querySelector("#detailSales");
const detailDescription = document.querySelector("#detailDescription");
const detailSelection = document.querySelector("#detailSelection");
const detailDelivery = document.querySelector("#detailDelivery");
const detailNotice = document.querySelector("#detailNotice");
const detailStoryTitle = document.querySelector("#detailStoryTitle");
const detailStoryCopy = document.querySelector("#detailStoryCopy");
const detailStoryImage = document.querySelector("#detailStoryImage");
const detailSpecIp = document.querySelector("#detailSpecIp");
const detailSpecMaterial = document.querySelector("#detailSpecMaterial");
const detailSpecSize = document.querySelector("#detailSpecSize");
const detailSpecPackage = document.querySelector("#detailSpecPackage");
const detailPolicyCopy = document.querySelector("#detailPolicyCopy");
const detailRelatedList = document.querySelector("#detailRelatedList");
const detailCartButton = document.querySelector(".detail-cart");
const detailBuyButton = document.querySelector(".detail-buy");
const skuProductImage = document.querySelector("#skuProductImage");
const skuProductState = document.querySelector("#skuProductState");
const skuSheetTitle = document.querySelector("#skuSheetTitle");
const skuProductMeta = document.querySelector("#skuProductMeta");
const skuProductPrice = document.querySelector("#skuProductPrice");
const skuOptionList = document.querySelector("#skuOptionList");
const skuQuantityText = document.querySelector("#skuQuantity");
const skuLimitText = document.querySelector("#skuLimitText");
const skuDeliveryText = document.querySelector("#skuDeliveryText");
const skuTotal = document.querySelector("#skuTotal");
const skuConfirmButton = document.querySelector("[data-confirm-sku]");
const cartList = document.querySelector(".cart-list");
const cartTotal = document.querySelector("#cartTotal");
const cartSummaryLabel = document.querySelector("#cartSummaryLabel");
const cartSummaryNote = document.querySelector("#cartSummaryNote");
const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
const checkoutDiscount = document.querySelector("#checkoutDiscount");
const checkoutTotal = document.querySelector("#checkoutTotal");
const checkoutProductList = document.querySelector("#checkoutProductList");
const checkoutCount = document.querySelector("#checkoutCount");
const checkoutCoupon = document.querySelector("#checkoutCoupon");
const checkoutAgreement = document.querySelector("#checkoutAgreement");
const checkoutAddressOptions = document.querySelector("#checkoutAddressOptions");
const checkoutAddressToggle = document.querySelector("[data-checkout-address-toggle]");
const checkoutAddressName = document.querySelector("#checkoutAddressName");
const checkoutAddressText = document.querySelector("#checkoutAddressText");
const skuAddressText = document.querySelector("#skuAddressText");
const checkoutScrollArea = document.querySelector(".checkout-scroll-area");
const checkoutPayButton = document.querySelector("[data-confirm-pay]");
const checkoutButton = document.querySelector("[data-open-checkout]");
const cartManageButton = document.querySelector("[data-cart-manage]");
const cartPage = document.querySelector("#page-cart");
const cartCheckout = document.querySelector(".cart-checkout");
const cartEmptyState = document.querySelector("#cartEmptyState");
const cartEmptyTitle = document.querySelector("#cartEmptyTitle");
const cartEmptyCopy = document.querySelector("#cartEmptyCopy");
const cartEmptyAction = document.querySelector("#cartEmptyAction");
let cartManaging = false;
const checkoutTitle = document.querySelector("#checkoutTitle");
const selectAllButton = document.querySelector(".select-all");
let currentProduct = null;
let currentSku = null;
let skuQuantity = 1;
let skuMode = "cart";
const defaultDeliveryAddresses = [
  { id: "xuhui", label: "家", name: "谷多多用户", phone: "138****8266", district: "上海市徐汇区", address: "上海市徐汇区漕溪北路 88 号", isDefault: true },
  { id: "pudong", label: "公司", name: "谷多多用户", phone: "138****8266", district: "上海市浦东新区", address: "上海市浦东新区张江路 66 号", isDefault: false },
];
const addressStorageKey = "guji-address-book-v1";

function readStoredAddressBook() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(addressStorageKey) || "null");
    if (!stored || !Array.isArray(stored.addresses)) return null;
    const addresses = stored.addresses.filter((address) => address?.id && address?.name && address?.phone && address?.district && address?.address);
    if (!addresses.length) return null;
    const activeId = addresses.some((address) => address.id === stored.activeAddressId) ? stored.activeAddressId : addresses[0].id;
    return { addresses, activeAddressId: activeId };
  } catch {
    return null;
  }
}

const storedAddressBook = readStoredAddressBook();
const deliveryAddresses = storedAddressBook?.addresses || defaultDeliveryAddresses.map((address) => ({ ...address }));
let activeAddressId = storedAddressBook?.activeAddressId || deliveryAddresses[0].id;
let pendingAccountAddressId = activeAddressId;
let checkoutContext = { mode: "cart", items: [], subtotal: 0, discount: 0, total: 0 };
let activeCartFilter = "全部";
let lastProductTrigger = null;
let productReturnSearch = "";
const favoriteProductIds = new Set();

function activeDeliveryAddress() {
  return deliveryAddresses.find((address) => address.id === activeAddressId) || deliveryAddresses[0];
}

function persistAddressBook() {
  try {
    window.localStorage.setItem(addressStorageKey, JSON.stringify({ addresses: deliveryAddresses, activeAddressId }));
  } catch {
    // The address still works for the current session when storage is unavailable.
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function renderCheckoutAddressOptions() {
  checkoutAddressOptions.innerHTML = deliveryAddresses.map((address) => `<label><input type="radio" name="checkoutAddress" value="${escapeHtml(address.id)}" ${address.id === activeAddressId ? "checked" : ""} /><span>${address.isDefault ? "<b>默认</b> " : ""}${escapeHtml(address.address)}</span></label>`).join("");
}

function syncDeliveryAddress() {
  const address = activeDeliveryAddress();
  const defaultCopy = address.isDefault ? " · 默认地址" : "";
  detailDelivery.textContent = `${address.district} · ${currentProduct ? deliveryCopy(currentProduct) : "48 小时内发货"}`;
  skuAddressText.textContent = `${address.district}${defaultCopy}`;
  checkoutAddressName.textContent = `${address.name} ${address.phone}`;
  checkoutAddressText.textContent = `${address.address}${defaultCopy}`;
  renderCheckoutAddressOptions();
  checkoutAddressOptions.querySelectorAll("input[name='checkoutAddress']").forEach((input) => {
    input.checked = input.value === address.id;
  });
}

function useDeliveryAddress(addressId, announce = true) {
  const address = deliveryAddresses.find((item) => item.id === addressId);
  if (!address) return;
  activeAddressId = address.id;
  syncDeliveryAddress();
  persistAddressBook();
  if (announce) showToast(`已使用${address.label}地址`);
}

syncDeliveryAddress();

function formatMoney(value) {
  return Number(value.toFixed(2)).toString();
}

function selectedPayment(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "微信支付";
}

document.querySelectorAll("[data-payment-group]").forEach((group) => {
  group.addEventListener("change", (event) => {
    group.querySelectorAll("label").forEach((label) => label.classList.toggle("is-selected", label.contains(event.target)));
    if (event.target.name === "checkoutPayment") updateCheckoutTotals();
    if (event.target.name === "drawPayment") updateDrawPaymentButton();
  });
});

function productStateClass(state) {
  if (state === "现货" || state === "上新") return "is-stock";
  if (state === "预售") return "is-presale";
  if (state === "到货提醒") return "is-reminder";
  return "is-limited";
}

function deliveryCopy(product) {
  if (product.state === "预售") return product.shipping.includes("9 月") ? "预计 9 月下旬开始发货" : "预计 10 月开始发货";
  if (product.state === "到货提醒") return "补货时间待官方确认";
  return product.shipping
    .replace(/48h\s*内发货/, "48 小时内发货")
    .replace(/48h\s*发货/, "48 小时内发货");
}

function renderProductDetail(product) {
  currentProduct = product;
  currentSku = product.options[0];
  skuQuantity = 1;
  const stateLabel = product.state === "上新" ? "现货上新" : product.state;
  detailProductImage.src = product.image;
  detailProductImage.alt = product.name;
  detailThumbOne.src = product.image;
  detailThumbTwo.src = product.image;
  detailStoryImage.src = product.image;
  detailStoryImage.alt = `${product.name}细节展示`;
  const favoriteButton = document.querySelector("[data-detail-favorite]");
  const isFavorite = favoriteProductIds.has(product.id);
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.textContent = isFavorite ? "♥" : "♡";
  document.querySelectorAll("[data-detail-gallery]").forEach((button) => button.classList.toggle("is-active", button.dataset.detailGallery === "front"));
  detailProductImage.classList.remove("show-package");
  document.querySelectorAll("[data-detail-anchor]").forEach((button) => button.classList.toggle("is-active", button.dataset.detailAnchor === "detailStory"));
  detailGalleryBadge.textContent = `${product.kind} · 官方授权`;
  detailStateBadge.textContent = stateLabel;
  detailStateBadge.className = productStateClass(product.state);
  detailBrand.textContent = `${product.ip} · 正版授权`;
  productDetailTitle.textContent = product.name;
  detailProductPrice.textContent = `¥${formatMoney(product.price)}`;
  detailProductUnit.textContent = `/${product.unit}`;
  detailSales.textContent = product.stock ? `已售 ${product.sold} · 剩余 ${product.stock} ${product.unit === "件" ? "件" : "抽"}` : `已售 ${product.sold} · 等待补货`;
  detailDescription.textContent = product.description;
  detailSelection.textContent = `${currentSku.label} · 1 ${product.unit === "件" ? "件" : "组"}`;
  syncDeliveryAddress();
  detailStoryTitle.textContent = `${product.ip} · ${product.kind}收藏系列`;
  detailStoryCopy.textContent = product.description + " 商品采用独立保护包装，减少运输过程中的磨损。";
  detailSpecIp.textContent = product.ip;
  detailSpecMaterial.textContent = product.material;
  detailSpecSize.textContent = product.size;
  detailSpecPackage.textContent = product.package;
  if (product.state === "预售") {
    detailNotice.innerHTML = `<b>预售说明</b><p>${deliveryCopy(product)}。现货与预售商品默认拆单发货，预售截单后非质量问题不支持取消。</p>`;
    detailPolicyCopy.textContent = "本商品为预售正版授权周边，具体发货时间可能受生产进度影响。截单后不支持无理由取消，质量问题请在签收后 48 小时内联系客服。";
  } else if (product.state === "到货提醒") {
    detailNotice.innerHTML = "<b>补货提醒</b><p>当前暂未开售。订阅后可在补货时收到站内提醒，本次订阅不会自动下单。</p>";
    detailPolicyCopy.textContent = "当前页面仅开放到货提醒。实际售价、库存和发货时间以补货通知及再次确认页面为准。";
  } else {
    detailNotice.innerHTML = `<b>现货说明</b><p>${deliveryCopy(product)}，偏远地区时效可能顺延。</p>`;
    detailPolicyCopy.textContent = "商品为正版授权周边。非质量问题不支持拆封后退换；运输破损请在签收后 48 小时内联系客服并提供开箱凭证。";
  }
  const unavailable = product.state === "到货提醒";
  detailCartButton.textContent = unavailable ? "订阅到货提醒" : "加入购物车";
  detailBuyButton.textContent = unavailable ? "查看同 IP 商品" : "立即购买";
  detailRelatedList.innerHTML = productCatalog
    .filter((item) => item.id !== product.id && (item.ip === product.ip || item.kind === product.kind))
    .slice(0, 3)
    .map((item) => `<button type="button" data-related-product="${item.id}"><img src="${item.image}" alt=""><span><strong>${item.name}</strong><small>${item.state} · ¥${formatMoney(item.price)}</small></span></button>`)
    .join("");
}

function openProductDetail(product, trigger = product.card, options = {}) {
  lastProductTrigger = trigger instanceof HTMLElement ? trigger : product.card;
  productReturnSearch = options.returnToSearch || "";
  renderProductDetail(product);
  productDetailOpen = true;
  productDetailView.hidden = false;
  productDetailView.querySelector("[data-close-product-detail]")?.focus({ preventScroll: true });
  setAppBackgroundInert(false);
  productDetailScroll.scrollTop = 0;
  window.requestAnimationFrame(() => {
    productDetailView.classList.add("is-open");
    productDetailView.querySelector("[data-close-product-detail]")?.focus();
  });
  if (options.pushHistory !== false) window.history.pushState({ productDetail: product.id }, "", window.location.href);
}

function closeProductDetail({ restoreFocus = true, updateHistory = true } = {}) {
  if (!productDetailOpen) return;
  if (activeDialog) closeDialog({ restoreFocus: false });
  if (updateHistory && window.history.state?.productDetail) {
    window.history.back();
    return;
  }
  productDetailOpen = false;
  productDetailView.classList.remove("is-open");
  productDetailView.hidden = true;
  productDetailView.inert = false;
  setAppBackgroundInert(false);
  if (!updateHistory && window.history.state?.productDetail) window.history.replaceState(null, "", window.location.href);
  if (productReturnSearch) {
    const query = productReturnSearch;
    productReturnSearch = "";
    openSearch(query, homeSearchInput);
    runSearch(query);
  } else if (restoreFocus && lastProductTrigger?.isConnected) lastProductTrigger.focus();
  lastProductTrigger = null;
}

document.querySelector("[data-close-product-detail]").addEventListener("click", () => closeProductDetail());
document.querySelector("[data-detail-share]").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${currentProduct.name} · ¥${formatMoney(currentProduct.price)}`);
    showToast("商品信息已复制");
  } catch {
    showToast("当前环境无法复制，请稍后再试");
  }
});
document.querySelector("[data-detail-favorite]").addEventListener("click", (event) => {
  const selected = event.currentTarget.getAttribute("aria-pressed") !== "true";
  if (selected) favoriteProductIds.add(currentProduct.id);
  else favoriteProductIds.delete(currentProduct.id);
  event.currentTarget.setAttribute("aria-pressed", String(selected));
  event.currentTarget.textContent = selected ? "♥" : "♡";
  showToast(selected ? "已收藏到我的收藏" : "已取消收藏");
});
document.querySelectorAll("[data-detail-gallery]").forEach((button) => button.addEventListener("click", () => {
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  detailProductImage.classList.toggle("show-package", button.dataset.detailGallery === "package");
}));
document.querySelectorAll("[data-detail-anchor]").forEach((button) => button.addEventListener("click", () => {
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  document.querySelector(`#${button.dataset.detailAnchor}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}));
detailRelatedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-related-product]");
  if (!button) return;
  const product = productCatalog.find((item) => item.id === button.dataset.relatedProduct);
  if (product) {
    window.history.replaceState({ productDetail: product.id }, "", window.location.href);
    renderProductDetail(product);
    productDetailScroll.scrollTo({ top: 0, behavior: "smooth" });
  }
});

function renderSkuSheet() {
  const unavailable = currentProduct.state === "到货提醒";
  skuSheet.classList.toggle("is-reminder", unavailable);
  skuProductImage.src = currentProduct.image;
  skuProductImage.alt = currentProduct.name;
  skuProductState.textContent = unavailable ? "可订阅提醒 · 当前无库存" : `${currentProduct.state} · 剩余 ${currentSku.stock} ${currentProduct.unit === "件" ? "件" : "组"}`;
  skuSheetTitle.textContent = currentProduct.name;
  skuProductMeta.textContent = unavailable ? "补货后将发送站内提醒" : `${currentSku.label} · ${currentSku.detail}`;
  skuProductPrice.textContent = `¥${formatMoney(currentSku.price)}`;
  skuOptionList.innerHTML = currentProduct.options.map((option) => `<label class="${option.id === currentSku.id ? "is-selected" : ""}"><input type="radio" name="skuOption" value="${option.id}" ${option.id === currentSku.id ? "checked" : ""}><span><b>${option.label}</b><small>${option.detail}</small></span></label>`).join("");
  skuQuantityText.textContent = String(skuQuantity);
  skuLimitText.textContent = unavailable ? "补货时间待定" : `每人限购 ${currentProduct.maxQty} ${currentProduct.unit === "件" ? "件" : "组"}`;
  syncDeliveryAddress();
  skuDeliveryText.textContent = deliveryCopy(currentProduct);
  skuTotal.textContent = unavailable ? "—" : `¥${formatMoney(currentSku.price * skuQuantity)}`;
  skuConfirmButton.textContent = unavailable ? "订阅到货提醒" : skuMode === "buy" ? "确认购买" : skuMode === "select" ? "确认选择" : "确认加入购物车";
  skuConfirmButton.disabled = false;
  document.querySelector("[data-sku-qty='minus']").disabled = skuQuantity <= 1;
  document.querySelector("[data-sku-qty='plus']").disabled = skuQuantity >= currentProduct.maxQty;
}

function openSkuSheet(mode, trigger) {
  if (!currentProduct) return;
  skuMode = mode;
  currentSku = currentSku || currentProduct.options[0];
  skuQuantity = Math.min(Math.max(1, skuQuantity), currentProduct.maxQty);
  renderSkuSheet();
  openDialog(skuSheet, trigger);
}

document.querySelectorAll("[data-open-sku]").forEach((button) => button.addEventListener("click", () => {
  if (currentProduct?.state === "到货提醒" && button === detailBuyButton) {
    activeHomeIp = currentProduct.ip;
    productReturnSearch = "";
    closeProductDetail({ restoreFocus: false, updateHistory: false });
    if (currentPage !== "home") navigate("home");
    window.setTimeout(() => {
      document.querySelector(`.ip-filter[data-ip='${activeHomeIp}']`)?.click();
    }, 80);
    return;
  }
  openSkuSheet(button.dataset.openSku, button);
}));

skuOptionList.addEventListener("change", (event) => {
  currentSku = currentProduct.options.find((option) => option.id === event.target.value) || currentProduct.options[0];
  skuQuantity = 1;
  renderSkuSheet();
});
document.querySelectorAll("[data-sku-qty]").forEach((button) => button.addEventListener("click", () => {
  skuQuantity = Math.min(currentProduct.maxQty, Math.max(1, skuQuantity + (button.dataset.skuQty === "plus" ? 1 : -1)));
  renderSkuSheet();
}));
document.querySelectorAll("[data-toggle-detail-address]").forEach((button) => button.addEventListener("click", () => openAccountView("address", "", button)));

productCards.forEach((card) => {
  card.addEventListener("click", () => openProductDetail(productFromCard(card), card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProductDetail(productFromCard(card), card);
    }
  });
});

function cartItems() {
  return [...cartList.querySelectorAll(".cart-item")];
}

function updateCartBadge() {
  const quantity = cartItems().reduce((sum, item) => sum + Number(item.dataset.quantity), 0);
  const badge = document.querySelector(".bottom-item.has-badge b");
  badge.textContent = String(quantity);
  badge.hidden = quantity === 0;
}

function applyCartFilter() {
  const items = cartItems();
  items.forEach((item) => (item.hidden = activeCartFilter !== "全部" && item.dataset.state !== activeCartFilter));
  const counts = { 全部: items.length, 现货: items.filter((item) => item.dataset.state === "现货").length, 预售: items.filter((item) => item.dataset.state === "预售").length };
  document.querySelectorAll("[data-cart-filter]").forEach((button) => (button.textContent = `${button.dataset.cartFilter} ${counts[button.dataset.cartFilter]}`));
}

function updateCart() {
  const items = cartItems();
  const cartIsEmpty = items.length === 0;
  if (cartIsEmpty && cartManaging) {
    cartManaging = false;
    cartPage.classList.remove("is-managing");
    cartManageButton.classList.remove("is-managing");
    cartManageButton.textContent = "管理";
  }
  applyCartFilter();
  const scopedItems = activeCartFilter === "全部" ? items : items.filter((item) => !item.hidden);
  const filterIsEmpty = scopedItems.length === 0;
  cartEmptyState.hidden = !filterIsEmpty;
  cartEmptyTitle.textContent = cartIsEmpty ? "购物车还是空的" : `暂无${activeCartFilter}商品`;
  cartEmptyCopy.textContent = cartIsEmpty ? "去逛逛，把喜欢的正版周边带回来" : "切换到全部分类查看购物车中的其他商品";
  cartEmptyAction.textContent = cartIsEmpty ? "继续逛逛" : "查看全部商品";
  cartCheckout.hidden = cartIsEmpty;
  cartManageButton.disabled = cartIsEmpty;
  const selected = scopedItems.filter((item) => item.classList.contains("is-selected"));
  const selectedQuantity = selected.reduce((sum, item) => sum + Number(item.dataset.quantity), 0);
  const total = selected.reduce((sum, item) => sum + Number(item.dataset.price) * Number(item.dataset.quantity), 0);
  cartSummaryLabel.textContent = cartManaging ? "已选" : "合计";
  cartTotal.textContent = cartManaging ? `${selected.length} 种` : `¥${formatMoney(total)}`;
  cartSummaryNote.textContent = cartManaging ? "仅删除所选商品" : "不含运费";
  checkoutButton.textContent = cartManaging
    ? `删除所选（${selected.length}种）`
    : `去结算（${selected.length}种 / ${selectedQuantity}件）`;
  checkoutButton.disabled = selected.length === 0;
  checkoutButton.classList.toggle("is-danger", cartManaging);
  const allSelected = scopedItems.length > 0 && selected.length === scopedItems.length;
  selectAllButton.classList.toggle("is-selected", allSelected);
  selectAllButton.setAttribute("aria-pressed", String(allSelected));
  items.forEach((item) => {
    const quantity = Number(item.dataset.quantity);
    const max = Number(item.dataset.maxQuantity || 9);
    item.querySelector("[data-qty-action='minus']").disabled = cartManaging || quantity <= 1;
    item.querySelector("[data-qty-action='plus']").disabled = cartManaging || quantity >= max;
  });
  updateCartBadge();
}

cartEmptyAction.addEventListener("click", () => {
  if (cartItems().length === 0) {
    navigate("home");
    return;
  }
  activeCartFilter = "全部";
  document.querySelectorAll("[data-cart-filter]").forEach((button) => {
    const selected = button.dataset.cartFilter === "全部";
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  updateCart();
});

function addProductToCart(product, sku = product.options[0], quantity = 1) {
  const cartId = `${product.id}:${sku.id}`;
  const existing = cartItems().find((item) => item.dataset.cartId === cartId);
  if (existing) {
    existing.dataset.quantity = String(Math.min(Number(existing.dataset.maxQuantity || 9), Number(existing.dataset.quantity) + quantity));
    existing.querySelector(".qty-control b").textContent = existing.dataset.quantity;
    existing.classList.add("is-selected");
  } else {
    const item = document.createElement("article");
    item.className = "cart-item is-selected";
    item.dataset.cartId = cartId;
    item.dataset.state = product.state === "预售" ? "预售" : "现货";
    item.dataset.price = String(sku.price);
    item.dataset.quantity = String(quantity);
    item.dataset.maxQuantity = String(product.maxQty);
    item.dataset.spec = sku.label;
    const stateClass = item.dataset.state === "预售" ? "presale-state" : "stock-state";
    item.innerHTML = `<button class="cart-check" type="button" aria-pressed="true" aria-label="选择${product.name}"></button><img src="${product.image}" alt="${product.name}"><div class="cart-item-info"><span class="cart-state ${stateClass}">${item.dataset.state}</span><h2>${product.name}</h2><p>${sku.label} · ${deliveryCopy(product)}</p><strong>¥${formatMoney(sku.price)}</strong><div class="qty-control"><button type="button" data-qty-action="minus" aria-label="减少${product.name}数量">−</button><b>${quantity}</b><button type="button" data-qty-action="plus" aria-label="增加${product.name}数量">＋</button></div></div>`;
    cartList.prepend(item);
  }
  updateCart();
}

function checkoutItemFromCart(item) {
  const description = item.querySelector("p")?.textContent || "以结算页为准";
  const spec = item.dataset.spec || "标准款";
  const shippingParts = description.split(" · ");
  if (shippingParts[0] === spec || shippingParts[0] === item.dataset.state) shippingParts.shift();
  return {
    cartId: item.dataset.cartId,
    name: item.querySelector("h2")?.textContent || "商品",
    image: item.querySelector(":scope > img")?.src || "",
    state: item.dataset.state,
    spec,
    shipping: shippingParts.join(" · ") || description,
    price: Number(item.dataset.price),
    quantity: Number(item.dataset.quantity),
  };
}

function updateCheckoutTotals() {
  const subtotal = checkoutContext.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.min(Number(checkoutCoupon.value || 0), subtotal);
  const total = subtotal - discount;
  checkoutContext.subtotal = subtotal;
  checkoutContext.discount = discount;
  checkoutContext.total = total;
  checkoutSubtotal.textContent = `¥${formatMoney(subtotal)}`;
  checkoutDiscount.textContent = `−¥${formatMoney(discount)}`;
  checkoutTotal.textContent = `¥${formatMoney(total)}`;
  if (!checkoutPayButton.disabled) checkoutPayButton.textContent = `${selectedPayment("checkoutPayment")} ¥${formatMoney(total)}`;
}

function prepareCheckout(items, mode, trigger = document.activeElement) {
  checkoutContext = { mode, items, subtotal: 0, discount: 0, total: 0 };
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  checkoutTitle.textContent = mode === "cart" ? "确认购物车结算" : "确认立即购买";
  checkoutCount.textContent = `共 ${items.length} 种 · ${quantity} 件`;
  checkoutProductList.innerHTML = items.map((item) => `<article><img src="${item.image}" alt=""><div><span>${item.state}</span><strong>${item.name}</strong><small>${item.spec} · ${item.shipping}</small></div><p><b>¥${formatMoney(item.price)}</b><em>× ${item.quantity}</em></p></article>`).join("");
  checkoutCoupon.value = "0";
  checkoutAgreement.checked = true;
  checkoutPayButton.disabled = false;
  checkoutPayButton.classList.remove("is-paying");
  checkoutAddressOptions.hidden = true;
  checkoutAddressToggle.setAttribute("aria-expanded", "false");
  syncDeliveryAddress();
  checkoutScrollArea.scrollTop = 0;
  updateCheckoutTotals();
  openDialog(checkoutSheet, trigger);
}

skuConfirmButton.addEventListener("click", (event) => {
  if (!currentProduct) return;
  if (currentProduct.state === "到货提醒") {
    closeDialog();
    detailCartButton.textContent = "已订阅提醒";
    showToast("已订阅到货提醒，可在我的订阅中管理");
    return;
  }
  detailSelection.textContent = `${currentSku.label} · ${skuQuantity} ${currentProduct.unit === "件" ? "件" : "组"}`;
  if (skuMode === "select") {
    closeDialog();
    showToast("规格与数量已更新");
  } else if (skuMode === "cart") {
    addProductToCart(currentProduct, currentSku, skuQuantity);
    closeDialog();
    showToast(`${currentProduct.name} 已加入购物车`);
  } else {
    const item = { name: currentProduct.name, image: currentProduct.image, state: currentProduct.state, spec: currentSku.label, shipping: deliveryCopy(currentProduct), price: currentSku.price, quantity: skuQuantity };
    prepareCheckout([item], "buy-now", event.currentTarget);
  }
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
    const max = Number(item.dataset.maxQuantity || 9);
    const next = Math.min(max, Math.max(1, Number(item.dataset.quantity) + (quantityButton.dataset.qtyAction === "plus" ? 1 : -1)));
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
  updateCart();
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
  const selected = cartItems().filter((item) => !item.hidden && item.classList.contains("is-selected"));
  if (!selected.length) return showToast("请先选择商品");
  if (cartManaging) {
    const removed = selected.length;
    selected.forEach((item) => item.remove());
    updateCart();
    showToast(`已删除 ${removed} 种商品`);
    return;
  }
  prepareCheckout(selected.map(checkoutItemFromCart), "cart", event.currentTarget);
});

checkoutCoupon.addEventListener("change", updateCheckoutTotals);
checkoutAgreement.addEventListener("change", () => {
  checkoutPayButton.disabled = !checkoutAgreement.checked;
});
checkoutAddressToggle.addEventListener("click", (event) => {
  checkoutAddressOptions.hidden = !checkoutAddressOptions.hidden;
  event.currentTarget.setAttribute("aria-expanded", String(!checkoutAddressOptions.hidden));
});
checkoutAddressOptions.addEventListener("change", (event) => {
  useDeliveryAddress(event.target.value, false);
  const address = activeDeliveryAddress();
  checkoutAddressOptions.hidden = true;
  checkoutAddressToggle.setAttribute("aria-expanded", "false");
  window.requestAnimationFrame(() => {
    checkoutScrollArea.scrollTo({ top: 0, behavior: "smooth" });
    checkoutAddressToggle.focus({ preventScroll: true });
    showToast(`已使用${address.label}地址`);
  });
});

checkoutPayButton.addEventListener("click", (event) => {
  if (!checkoutAgreement.checked) return;
  const button = event.currentTarget;
  const paymentMethod = selectedPayment("checkoutPayment");
  button.disabled = true;
  button.classList.add("is-paying");
  button.textContent = `${paymentMethod}支付中…`;
  window.setTimeout(() => {
    const orderNumber = `GDD${Date.now().toString().slice(-10)}`;
    if (checkoutContext.mode === "cart") {
      const purchasedIds = new Set(checkoutContext.items.map((item) => item.cartId).filter(Boolean));
      cartItems().filter((item) => purchasedIds.has(item.dataset.cartId)).forEach((item) => item.remove());
      updateCart();
    }
    const orderName = checkoutContext.items.length > 1 ? `${checkoutContext.items[0].name}等 ${checkoutContext.items.length} 种商品` : checkoutContext.items[0].name;
    accountContent.orders.unshift([orderName, "待发货", `¥${formatMoney(checkoutContext.total)} · ${orderNumber}`]);
    const pendingShipCount = document.querySelector("[data-account-filter='待发货'] strong");
    if (pendingShipCount) pendingShipCount.textContent = String(Number(pendingShipCount.textContent || 0) + 1);
    document.querySelector("#orderSuccessMeta").textContent = `订单号 ${orderNumber} · 实付 ¥${formatMoney(checkoutContext.total)}`;
    button.classList.remove("is-paying");
    button.textContent = `${paymentMethod} ¥${formatMoney(checkoutContext.total)}`;
    openDialog(orderSuccessSheet, button);
  }, 760);
});

document.querySelector("[data-order-back-home]").addEventListener("click", () => {
  closeDialog({ restoreFocus: false });
  if (productDetailOpen) closeProductDetail({ restoreFocus: false, updateHistory: false });
  navigate("home");
});
document.querySelector("[data-order-view]").addEventListener("click", (event) => {
  closeDialog({ restoreFocus: false });
  if (productDetailOpen) closeProductDetail({ restoreFocus: false, updateHistory: false });
  navigate("mine");
  window.setTimeout(() => openAccountView("orders", "", event.currentTarget), 100);
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
const poolDetailScroll = document.querySelector("#poolDetailScroll");
const poolDetailTitle = document.querySelector("#poolDetailTitle");
const poolDetailMeta = document.querySelector("#poolDetailMeta");
const poolDetailType = document.querySelector("#poolDetailType");
const poolDetailIp = document.querySelector("#poolDetailIp");
const poolDetailImage = document.querySelector("#poolDetailImage");
const poolDetailPrice = document.querySelector("#poolDetailPrice");
const poolRareRate = document.querySelector("#poolRareRate");
const poolActionPrice = document.querySelector("#poolActionPrice");
const poolActionLabel = document.querySelector("#poolActionLabel");
const poolActionSaving = document.querySelector("#poolActionSaving");
const poolOfferList = document.querySelector("#poolOfferList");
const poolStockCopy = document.querySelector("#poolStockCopy");
const poolStockProgress = document.querySelector("#poolStockProgress");
const poolGrandPrizes = document.querySelector("#poolGrandPrizes");
const poolTierGrid = document.querySelector("#poolTierGrid");
const enterPoolButton = document.querySelector("[data-enter-pool]");
let currentPool = null;
let lastPoolTrigger = null;
let activePrizeView = "all";
let activePoolOfferId = "one";

function updatePoolOfferSummary(pool, box) {
  const quote = poolOfferQuote(pool, activePoolOfferId, box);
  poolActionLabel.textContent = quote.id === "all" ? `全收 ${quote.count} 抽` : quote.label;
  poolActionPrice.textContent = `¥${formatMoney(quote.price)}`;
  poolActionSaving.textContent = quote.discount > 0 ? `已优惠 ¥${formatMoney(quote.discount)}` : "每抽必得";
  enterPoolButton.disabled = !quote.available;
  enterPoolButton.textContent = quote.available ? `参与 ${quote.count} 抽` : "库存不足";
}

function renderPoolOfferSelection(pool, box) {
  let quote = poolOfferQuote(pool, activePoolOfferId, box);
  if (!quote.available) {
    const fallback = pool.offers.map((offer) => poolOfferQuote(pool, offer.id, box)).find((offer) => offer.available);
    activePoolOfferId = fallback?.id || "one";
    quote = poolOfferQuote(pool, activePoolOfferId, box);
  }
  poolOfferList.innerHTML = pool.offers.map((offer) => {
    const option = poolOfferQuote(pool, offer.id, box);
    const selected = option.id === activePoolOfferId;
    const countCopy = option.id === "all" ? `${option.count}抽` : option.label;
    return `<label class="${selected ? "is-selected" : ""}${option.available ? "" : " is-disabled"}"><input type="radio" name="poolOffer" value="${option.id}" ${selected ? "checked" : ""} ${option.available ? "" : "disabled"}><span><small>${option.id === "all" ? `余 ${box.remaining}` : option.badge}</small><strong>${countCopy}</strong><b>¥${formatMoney(option.price)}</b></span></label>`;
  }).join("");
  updatePoolOfferSummary(pool, box);
}

function renderPoolDetail(pool) {
  currentPool = pool;
  const box = selectedPoolBox(pool);
  const tierRows = pool.prizes.map((prize, index) => ({ ...prize, remaining: box.counts[index], probability: box.remaining ? (box.counts[index] / box.remaining) * 100 : 0 }));
  const grandPrize = tierRows[0];
  poolDetailTitle.textContent = pool.title;
  poolDetailMeta.textContent = `剩余 ${box.remaining}/${box.total} 份 · ${pool.popularity} 人参与`;
  poolDetailType.textContent = pool.type;
  poolDetailIp.textContent = `${pool.ip} · 正版授权`;
  document.querySelector("#poolDetailBoxState").textContent = box.lastRemaining ? "LAST 未出" : "LAST 已出";
  document.querySelector("#poolProbabilityUpdated").textContent = `概率更新于${pool.probabilityUpdated}`;
  document.querySelector("#poolBoxLabel").textContent = `第 ${box.number} / ${pool.boxes.length} 箱`;
  poolDetailImage.src = pool.image;
  poolDetailImage.alt = `${pool.title}赏品预览`;
  poolDetailPrice.textContent = `¥${pool.price}`;
  poolRareRate.textContent = grandPrize.remaining ? `${grandPrize.probability.toFixed(grandPrize.probability < 1 ? 1 : 0)}%` : "已抽完";
  renderPoolOfferSelection(pool, box);
  poolStockCopy.textContent = `${box.remaining} / ${box.total} 份`;
  poolStockProgress.setAttribute("aria-valuemax", String(box.total));
  poolStockProgress.setAttribute("aria-valuenow", String(box.remaining));
  poolStockProgress.querySelector("b").style.width = `${Math.max(0, Math.min(100, (box.remaining / box.total) * 100))}%`;
  poolGrandPrizes.innerHTML = [
    { ...grandPrize, status: `${grandPrize.remaining}/${grandPrize.total}`, copy: grandPrize.remaining ? `${grandPrize.probability.toFixed(1)}%` : "已抽完" },
    { ...pool.lastPrize, remaining: box.lastRemaining, status: `${box.lastRemaining}/${pool.lastPrize.total}`, copy: box.lastRemaining ? "最后 1 抽必得" : "已抽完" },
  ].map((prize) => `<article class="${prize.remaining ? "" : "is-sold-out"}" data-remaining="${prize.remaining}" ${activePrizeView === "remaining" && !prize.remaining ? "hidden" : ""}><span>${prize.tier}</span><img src="${prize.image}" alt="${prize.name}">${prize.remaining ? "" : "<b>售罄</b>"}<strong>${prize.name}</strong><small>余 ${prize.status}</small><em>${prize.copy}</em></article>`).join("");
  poolTierGrid.innerHTML = tierRows.slice(1).map((prize) => `<article class="${prize.remaining ? "" : "is-sold-out"}" data-remaining="${prize.remaining}" ${activePrizeView === "remaining" && !prize.remaining ? "hidden" : ""}><span>${prize.tier}</span><img src="${prize.image}" alt="${prize.name}">${prize.remaining ? "" : "<b>售罄</b>"}<strong>${prize.name}</strong><small>剩余 ${prize.remaining}/${prize.total}</small><em>${prize.remaining ? `${prize.probability.toFixed(1)}%` : "已抽完"}</em></article>`).join("");
  document.querySelector("[data-pool-box='previous']").disabled = box.number <= 1;
  document.querySelector("[data-pool-box='next']").disabled = box.number >= pool.boxes.length;
  if (box.remaining <= 0) enterPoolButton.textContent = "本箱已抽完";
}

function openPool(poolId, trigger = null, options = {}) {
  const pool = typeof poolId === "string" ? poolById.get(poolId) : poolId;
  if (!pool) return;
  if (currentPage !== "pool") activatePage("pool", { instant: true });
  if (!options.fromRoute) window.history.pushState({ poolFromList: true, poolId: pool.id }, "", `#pool/${pool.id}`);
  lastPoolTrigger = trigger instanceof HTMLElement ? trigger : document.querySelector(`[data-pool-id="${pool.id}"]`);
  renderPoolDetail(pool);
  poolDetailOpen = true;
  poolDetailView.hidden = false;
  poolDetailScroll.scrollTop = 0;
  poolDetailView.querySelector("[data-close-pool-detail]")?.focus({ preventScroll: true });
  setAppBackgroundInert(false);
  document.title = `谷多多 · ${pool.title}`;
  window.requestAnimationFrame(() => {
    poolDetailView.classList.add("is-open");
    poolDetailView.querySelector("[data-close-pool-detail]")?.focus();
  });
}

function closePoolDetail({ restoreFocus = true, updateHistory = true } = {}) {
  if (!poolDetailOpen) return;
  if (activeDialog) closeDialog({ restoreFocus: false });
  if (updateHistory) {
    if (window.history.state?.poolFromList) window.history.back();
    else window.location.hash = "pool";
    return;
  }
  poolDetailOpen = false;
  poolDetailView.classList.remove("is-open");
  poolDetailView.hidden = true;
  poolDetailView.inert = false;
  setAppBackgroundInert(false);
  document.title = `谷多多 · ${pageNames[currentPage]}`;
  if (restoreFocus && lastPoolTrigger?.isConnected) lastPoolTrigger.focus();
  lastPoolTrigger = null;
}

document.querySelector("[data-close-pool-detail]").addEventListener("click", () => closePoolDetail());
document.querySelector("[data-pool-share]").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${currentPool.title} · ${window.location.href}`);
    showToast("赏池链接已复制");
  } catch {
    showToast("当前环境无法复制，请稍后再试");
  }
});

poolFeature.querySelector("[data-open-feature-pool]").addEventListener("click", (event) => openPool(poolFeature.dataset.poolId, event.currentTarget));
poolGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-pool-id]");
  if (card) openPool(card.dataset.poolId, card);
});
document.querySelectorAll("[data-pool-box]").forEach((button) => button.addEventListener("click", () => {
  if (!currentPool) return;
  const current = selectedPoolBoxes.get(currentPool.id) || currentPool.currentBox;
  const delta = button.dataset.poolBox === "previous" ? -1 : 1;
  selectedPoolBoxes.set(currentPool.id, Math.max(1, Math.min(currentPool.boxes.length, current + delta)));
  renderPoolDetail(currentPool);
  applyPoolFilters({ announce: false });
  showToast(`已切换到第 ${selectedPoolBoxes.get(currentPool.id)} 箱`);
}));
document.querySelectorAll("[data-prize-view]").forEach((button) => button.addEventListener("click", () => {
  activePrizeView = button.dataset.prizeView;
  button.parentElement.querySelectorAll("button").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  if (currentPool) renderPoolDetail(currentPool);
  showToast(activePrizeView === "remaining" ? "仅显示有余量赏品" : "已显示全部赏品");
}));
poolOfferList.addEventListener("change", (event) => {
  if (!currentPool || event.target.name !== "poolOffer") return;
  activePoolOfferId = event.target.value;
  poolOfferList.querySelectorAll("label").forEach((label) => label.classList.toggle("is-selected", label.contains(event.target)));
  updatePoolOfferSummary(currentPool, selectedPoolBox(currentPool));
});
enterPoolButton.addEventListener("click", () => {
  if (!currentPool) return;
  const box = selectedPoolBox(currentPool);
  if (!box.remaining) return showToast("当前赏箱已抽完，请切换其他箱");
  const quote = poolOfferQuote(currentPool, activePoolOfferId, box);
  if (!quote.available) return showToast(`当前箱仅剩 ${box.remaining} 抽，请调整档位`);
  openDrawConfirmation(createDrawOrder({ sourceType: "pool", sourceId: currentPool.id, offerId: activePoolOfferId, trigger: enterPoolButton }));
});

/* Draw payment and result */
const drawConfirmImage = document.querySelector("#drawConfirmImage");
const drawConfirmBrand = document.querySelector("#drawConfirmBrand");
const drawConfirmName = document.querySelector("#drawConfirmName");
const drawConfirmMeta = document.querySelector("#drawConfirmMeta");
const drawConfirmPrice = document.querySelector("#drawConfirmPrice");
const drawConfirmPlay = document.querySelector("#drawConfirmPlay");
const drawConfirmQuantity = document.querySelector("#drawConfirmQuantity");
const drawConfirmUnitPrice = document.querySelector("#drawConfirmUnitPrice");
const drawConfirmSubtotal = document.querySelector("#drawConfirmSubtotal");
const drawConfirmDiscount = document.querySelector("#drawConfirmDiscount");
const drawConfirmTotal = document.querySelector("#drawConfirmTotal");
const drawPayButton = document.querySelector("[data-confirm-draw]");
const drawResultTitle = document.querySelector("#drawResultTitle");
const drawResultMeta = document.querySelector("#drawResultMeta");
const drawResultGrid = document.querySelector("#drawResultGrid");
const drawPackPicker = document.querySelector("#drawPackPicker");
const drawOfferList = document.querySelector("#drawOfferList");
const drawDockTotal = document.querySelector("#drawDockTotal");
const drawOpeningPanel = document.querySelector("[data-opening-panel]");
const drawResultPanel = document.querySelector("[data-result-panel]");
const drawOpeningImage = document.querySelector("#drawOpeningImage");
let pendingDraw = null;
let lastCompletedDraw = null;
const wonPrizes = Array.isArray(demoTransactionState.wonPrizes)
  ? demoTransactionState.wonPrizes.filter((prize) => prize?.name && prize?.image).slice(0, 120)
  : [];
const minePrizeCabinet = document.querySelector("#minePrizeCabinet");
const minePrizeList = document.querySelector("#minePrizeList");
const minePrizeEmpty = document.querySelector("#minePrizeEmpty");

function renderMinePrizeCabinet() {
  minePrizeEmpty.hidden = wonPrizes.length !== 0;
  minePrizeList.innerHTML = wonPrizes.map((prize, index) => `<article aria-label="${escapeHtml(prize.name)}，${escapeHtml(prize.rarity || prize.tier || "赏品")}">
    <img src="${prize.image}" alt="${escapeHtml(prize.name)}"><div><span>${escapeHtml(prize.rarity || prize.tier || "已获得")}</span><strong>${escapeHtml(prize.name)}</strong><small>已入柜 · 可与其他赏品合并发货</small></div><button type="button" data-prize-shipping="${index}">申请发货</button>
  </article>`).join("");
}

function openMinePrizeCabinet() {
  navigate("mine", { reset: false });
  window.setTimeout(() => {
    minePrizeCabinet.hidden = false;
    renderMinePrizeCabinet();
    minePrizeCabinet.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    minePrizeCabinet.focus({ preventScroll: true });
  }, 90);
}

minePrizeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prize-shipping]");
  if (!button) return;
  const prize = wonPrizes[Number(button.dataset.prizeShipping)];
  if (prize) showToast(`${prize.name}已加入合并发货清单`);
});
document.querySelector("[data-open-prize-cabinet]").addEventListener("click", openMinePrizeCabinet);
document.querySelector("[data-return-to-draw]").addEventListener("click", () => {
  if (!lastCompletedDraw) return navigate("draw");
  window.location.hash = lastCompletedDraw.sourceType === "pool" ? `pool/${lastCompletedDraw.sourceId}` : `draw/${lastCompletedDraw.sourceId}`;
});
let activeDrawPackId = "flame-pack";
let activeDrawOfferId = "one";
const drawCampaignTitle = document.querySelector("#drawCampaignTitle");
const drawCampaignMeta = document.querySelector("#drawCampaignMeta");
const drawPackImage = document.querySelector("[data-preview-card] img");
const drawStageSelection = document.querySelector("#drawStageSelection");
const drawStageFacts = document.querySelector("#drawStageFacts");
const drawPackStage = document.querySelector(".pack-stage");

function currentDrawPack() {
  return drawPackById.get(activeDrawPackId) || drawPackCatalog[0];
}

function currentDrawOffer() {
  const pack = currentDrawPack();
  return pack.offers.find((offer) => offer.id === activeDrawOfferId) || pack.offers[0];
}

function updateDrawSelection() {
  const pack = currentDrawPack();
  const offer = currentDrawOffer();
  const available = offer.count <= pack.batchRemaining;
  drawDockTotal.textContent = `¥${offer.price}`;
  drawStageSelection.textContent = `${offer.label} · ¥${offer.price}`;
  document.querySelectorAll("[data-open-draw-confirm]").forEach((button) => {
    button.disabled = !available;
    button.setAttribute("aria-label", available ? `立即开包，${offer.label}，合计${offer.price}元` : `库存不足，无法购买${offer.label}`);
  });
}

function renderDrawPack(packId = activeDrawPackId, { updateRoute = true } = {}) {
  const pack = drawPackById.get(packId) || drawPackCatalog[0];
  activeDrawPackId = pack.id;
  if (!pack.offers.some((offer) => offer.id === activeDrawOfferId)) activeDrawOfferId = pack.offers[0].id;
  drawCampaignTitle.textContent = `${pack.ip} · ${pack.name}`;
  drawCampaignMeta.textContent = `全 ${pack.catalog.length} 款 · 每包随机 1 款`;
  drawPackImage.src = pack.image;
  drawPackImage.alt = pack.name;
  document.querySelector("#drawPackAvailability").textContent = `本批剩余 ${pack.batchRemaining}/${pack.batchTotal} 包 · 更新 ${pack.updatedAt}`;
  document.querySelector("#drawPackPrice").textContent = `¥${pack.unitPrice} / 包`;
  const rareRate = pack.catalog.filter((prize) => prize.rarity === "稀有").reduce((sum, prize) => sum + prize.weight, 0);
  drawStageFacts.innerHTML = `<span>全 ${pack.catalog.length} 款</span><span>稀有款 ${rareRate}%</span><span>每包独立随机</span>`;
  drawPackStage.dataset.ipGlyph = pack.ip.slice(0, 1);
  drawPackPicker.innerHTML = drawPackCatalog.map((item) => `<button type="button" data-pack-id="${item.id}" aria-pressed="${item.id === pack.id}"><img src="${item.image}" alt=""><span>${item.name}</span></button>`).join("");
  drawOfferList.innerHTML = pack.offers.map((offer) => {
    const available = offer.count <= pack.batchRemaining;
    return `<label class="${offer.id === activeDrawOfferId ? "is-selected" : ""}${available ? "" : " is-disabled"}"><input type="radio" name="drawOffer" value="${offer.id}" ${offer.id === activeDrawOfferId ? "checked" : ""} ${available ? "" : "disabled"}><span><small>${available ? offer.badge : "库存不足"}</small><strong>${offer.label}</strong><b>¥${offer.price}</b></span></label>`;
  }).join("");
  updateDrawSelection();
  if (updateRoute && parseAppRoute().page === "draw") window.history.replaceState(null, "", `#draw/${pack.id}`);
}

function createDrawOrder({ sourceType, sourceId, offerId, trigger }) {
  if (sourceType === "pool") {
    const pool = poolById.get(sourceId);
    const box = selectedPoolBox(pool);
    const offer = poolOfferQuote(pool, offerId, box);
    return { sourceType, sourceId, boxNumber: box.number, offerId: offer.id, label: offer.id === "all" ? `全收 ${offer.count} 抽` : offer.label, count: offer.count, unitPrice: pool.price, price: offer.price, subtotal: offer.subtotal, discount: offer.discount, available: offer.available, trigger, sourceName: pool.title, sourceIp: pool.ip, sourceImage: pool.prizes[0].image, meta: `第 ${box.number} 箱 · ${offer.count} 抽 · 每抽必得 1 件` };
  }
  const pack = drawPackById.get(sourceId);
  const offer = pack.offers.find((item) => item.id === offerId) || pack.offers[0];
  const subtotal = offer.count * pack.unitPrice;
  return { sourceType, sourceId, offerId: offer.id, label: offer.label, count: offer.count, unitPrice: pack.unitPrice, price: offer.price, subtotal, discount: subtotal - offer.price, available: offer.count <= pack.batchRemaining, trigger, sourceName: pack.name, sourceIp: pack.ip, sourceImage: pack.image, meta: `${offer.label} · 每包随机 1 款` };
}

function refreshDrawOrder(draw) {
  if (!draw) return null;
  if (draw.sourceType === "pool") {
    syncPersistedInventory({ poolId: draw.sourceId });
    const pool = poolById.get(draw.sourceId);
    if (currentPool?.id === pool?.id) renderPoolDetail(pool);
  } else {
    syncPersistedInventory({ packId: draw.sourceId });
    if (activeDrawPackId === draw.sourceId) renderDrawPack(draw.sourceId, { updateRoute: false });
  }
  return createDrawOrder({ sourceType: draw.sourceType, sourceId: draw.sourceId, offerId: draw.offerId, trigger: draw.trigger });
}

function renderDrawConfirmation(draw) {
  pendingDraw = draw;
  drawConfirmImage.src = draw.sourceImage;
  drawConfirmImage.alt = draw.sourceName;
  drawConfirmBrand.textContent = `${draw.sourceIp} · 正版授权`;
  drawConfirmName.textContent = draw.sourceName;
  drawConfirmMeta.textContent = draw.meta || `${draw.label} · 每包随机 1 款`;
  drawConfirmPlay.textContent = `${draw.sourceType === "pool" ? "有限赏" : "抽卡机"} · ${draw.sourceIp}`;
  drawConfirmQuantity.textContent = draw.sourceType === "pool" ? `第 ${draw.boxNumber} 箱 · ${draw.count} 抽` : `卡包 · ${draw.count} 包`;
  drawConfirmUnitPrice.textContent = `¥${formatMoney(draw.unitPrice)} / ${draw.sourceType === "pool" ? "抽" : "包"}`;
  drawConfirmPrice.textContent = `¥${formatMoney(draw.price)}`;
  drawConfirmSubtotal.textContent = `¥${formatMoney(draw.subtotal)}`;
  drawConfirmDiscount.textContent = `−¥${formatMoney(draw.discount)}`;
  drawConfirmTotal.textContent = `¥${formatMoney(draw.price)}`;
  drawPayButton.disabled = !draw.available;
  drawPayButton.classList.remove("is-paying");
  if (draw.available) updateDrawPaymentButton();
  else drawPayButton.textContent = "库存不足，请调整档位";
}

function openDrawConfirmation(draw) {
  draw = refreshDrawOrder(draw);
  if (!draw) return;
  if (!draw.available) {
    showToast(draw.sourceType === "pool" ? "当前赏箱库存不足，请调整抽取档位" : "当前批次卡包库存不足");
    return;
  }
  cancelDrawTransaction({ clearOrder: false });
  renderDrawConfirmation(draw);
  openDialog(drawConfirmSheet, draw.trigger);
  window.history.pushState({ ...(window.history.state || {}), drawConfirmOpen: true }, "", window.location.href);
  drawConfirmHistoryOpen = true;
}

function updateDrawPaymentButton() {
  if (!pendingDraw || drawPayButton.disabled) return;
  drawPayButton.textContent = `${selectedPayment("drawPayment")} ¥${formatMoney(pendingDraw.price)}`;
}

function randomUnit() {
  if (window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function weightedPrize(catalog, weights) {
  const total = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!total) return null;
  let cursor = randomUnit() * total;
  for (let index = 0; index < catalog.length; index += 1) {
    cursor -= Math.max(0, weights[index]);
    if (cursor < 0) return { prize: catalog[index], index };
  }
  return { prize: catalog[catalog.length - 1], index: catalog.length - 1 };
}

function commitDraw(draw) {
  let prizes = [];
  if (draw.sourceType === "pool") {
    const pool = poolById.get(draw.sourceId);
    const box = pool.boxes[draw.boxNumber - 1];
    for (let index = 0; index < draw.count && box.remaining > 0; index += 1) {
      const selected = weightedPrize(pool.prizes, box.counts);
      if (selected) {
        box.counts[selected.index] -= 1;
        box.remaining -= 1;
        prizes.push({ ...selected.prize, rarity: selected.prize.tier });
        if (box.remaining === 0 && box.lastRemaining) {
          box.lastRemaining = 0;
          prizes.push({ ...pool.lastPrize, rarity: pool.lastPrize.tier });
        }
      }
    }
    pool.probabilityUpdated = `今天 ${currentClockTime()}`;
    if (currentPool?.id === pool.id) renderPoolDetail(pool);
    applyPoolFilters({ announce: false });
  } else {
    const pack = drawPackById.get(draw.sourceId);
    prizes = Array.from({ length: draw.count }, () => weightedPrize(pack.catalog, pack.catalog.map((prize) => prize.weight))?.prize).filter(Boolean);
    pack.batchRemaining = Math.max(0, pack.batchRemaining - draw.count);
    pack.updatedAt = currentClockTime();
    if (activeDrawPackId === pack.id) renderDrawPack(pack.id, { updateRoute: false });
  }
  wonPrizes.unshift(...prizes);
  accountContent.records.unshift([draw.sourceName, draw.label, `刚刚 · 实付 ¥${formatMoney(draw.price)}`]);
  const recordCount = document.querySelector("[data-record-count]");
  if (recordCount) recordCount.textContent = String(Number(recordCount.textContent || 0) + 1);
  persistDemoTransactionState();
  renderMinePrizeCabinet();
  return prizes;
}

function cancelDrawTransaction({ clearOrder = true } = {}) {
  drawTransactionToken += 1;
  window.clearTimeout(drawPaymentTimer);
  window.clearTimeout(drawOpeningTimer);
  drawOpeningStageTimers.forEach((timer) => window.clearTimeout(timer));
  drawOpeningStageTimers = [];
  drawPaymentTimer = null;
  drawOpeningTimer = null;
  drawPaymentPending = false;
  drawOpeningActive = false;
  if (clearOrder) pendingDraw = null;
}

function finishDrawOpening() {
  if (drawOpeningPanel.hidden) return;
  window.clearTimeout(drawOpeningTimer);
  drawOpeningStageTimers.forEach((timer) => window.clearTimeout(timer));
  drawOpeningStageTimers = [];
  drawOpeningTimer = null;
  drawOpeningActive = false;
  drawResult.classList.remove("is-opening", "is-tearing", "is-flashing");
  drawOpeningPanel.hidden = true;
  drawResultPanel.hidden = false;
  drawResultTitle.focus({ preventScroll: true });
}

function startDrawOpening() {
  drawOpeningActive = true;
  document.querySelector("#drawOpeningStatus").textContent = "包装居中，准备揭晓";
  drawResult.classList.remove("is-tearing", "is-flashing");
  void drawOpeningPanel.offsetWidth;
  drawOpeningStageTimers = [
    window.setTimeout(() => {
      if (!drawOpeningActive) return;
      drawResult.classList.add("is-tearing");
      document.querySelector("#drawOpeningStatus").textContent = "正在撕开封口";
    }, 320),
    window.setTimeout(() => {
      if (!drawOpeningActive) return;
      drawResult.classList.add("is-flashing");
      document.querySelector("#drawOpeningStatus").textContent = "稀有闪光正在揭晓";
    }, 720),
  ];
  drawOpeningTimer = window.setTimeout(finishDrawOpening, 1100);
}

function renderResult(draw, prizes) {
  lastCompletedDraw = draw;
  drawResultTitle.textContent = prizes.length > 1 ? `恭喜获得 ${prizes.length} 件赏品！` : "恭喜获得新赏品！";
  drawResultGrid.classList.toggle("is-single", prizes.length === 1);
  drawResultGrid.innerHTML = prizes.map((prize) => `<article title="${escapeHtml(prize.name)}" aria-label="${escapeHtml(prize.name)}，${escapeHtml(prize.rarity)}"><img src="${prize.image}" alt="${escapeHtml(prize.name)}"><span>${escapeHtml(prize.rarity)}</span><strong>${escapeHtml(prize.name)}</strong></article>`).join("");
  drawResultMeta.textContent = `${prizes.length} 件赏品已存入「我的赏品」 · 实付 ¥${formatMoney(draw.price)}`;
  drawOpeningImage.src = draw.sourceImage;
  drawOpeningImage.alt = `正在开启${draw.sourceName}`;
  drawOpeningPanel.hidden = false;
  drawResultPanel.hidden = true;
  drawResult.classList.add("is-opening");
  openDialog(drawResult, draw.trigger);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    drawOpeningActive = true;
    finishDrawOpening();
  } else {
    window.requestAnimationFrame(() => window.requestAnimationFrame(startDrawOpening));
  }
}

drawPackPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pack-id]");
  if (!button) return;
  activeDrawOfferId = "one";
  renderDrawPack(button.dataset.packId);
  showToast(`已切换到${currentDrawPack().name}`);
});
drawOfferList.addEventListener("change", (event) => {
  activeDrawOfferId = event.target.value;
  drawOfferList.querySelectorAll("label").forEach((label) => label.classList.toggle("is-selected", label.contains(event.target)));
  updateDrawSelection();
});
document.querySelectorAll("[data-open-draw-confirm]").forEach((button) => button.addEventListener("click", (event) => {
  openDrawConfirmation(createDrawOrder({ sourceType: "pack", sourceId: activeDrawPackId, offerId: activeDrawOfferId, trigger: event.currentTarget }));
}));

drawPayButton.addEventListener("click", (event) => {
  if (!pendingDraw || drawPaymentPending) return;
  const previousDraw = pendingDraw;
  const draw = refreshDrawOrder(previousDraw);
  if (!draw?.available) {
    if (draw) renderDrawConfirmation(draw);
    showToast(draw?.sourceType === "pool" ? "当前赏箱库存不足，请调整档位" : "当前批次库存不足，请调整档位");
    return;
  }
  if (draw.count !== previousDraw.count || draw.price !== previousDraw.price) {
    renderDrawConfirmation(draw);
    showToast("库存已更新，订单金额已重算，请再次确认支付");
    return;
  }
  const paymentMethod = selectedPayment("drawPayment");
  const button = event.currentTarget;
  const token = ++drawTransactionToken;
  drawPaymentPending = true;
  button.disabled = true;
  button.classList.add("is-paying");
  button.textContent = `${paymentMethod}支付中…`;
  drawPaymentTimer = window.setTimeout(() => {
    if (token !== drawTransactionToken || !drawPaymentPending) return;
    const prizes = commitDraw(draw);
    drawPaymentPending = false;
    button.classList.remove("is-paying");
    button.disabled = false;
    button.textContent = `${paymentMethod} ¥${formatMoney(draw.price)}`;
    completedDrawAfterHistory = { draw, prizes };
    if (drawConfirmHistoryOpen) window.history.back();
    else {
      closeDialog({ restoreFocus: false, force: true, updateHistory: false });
      const completed = completedDrawAfterHistory;
      completedDrawAfterHistory = null;
      renderResult(completed.draw, completed.prizes);
    }
  }, 680);
});

document.querySelector("[data-skip-opening]").addEventListener("click", finishDrawOpening);
document.querySelector("[data-draw-again]").addEventListener("click", () => {
  const previous = lastCompletedDraw;
  closeDialog({ restoreFocus: false, force: true });
  if (!previous) return;
  const next = createDrawOrder({ sourceType: previous.sourceType, sourceId: previous.sourceId, offerId: previous.offerId, trigger: previous.trigger });
  if (next.sourceType === "pool" && !selectedPoolBox(poolById.get(next.sourceId)).remaining) return showToast("当前赏箱已抽完，请切换其他箱");
  openDrawConfirmation(next);
});
document.querySelector("[data-view-prizes]").addEventListener("click", () => {
  closeDialog({ restoreFocus: false, force: true });
  openMinePrizeCabinet();
});

/* Account detail */
const accountSheetTitle = document.querySelector("#accountSheetTitle");
const accountSheetList = document.querySelector("#accountSheetList");
const accountSheetClose = accountSheet.querySelector("[data-close-sheet]");

function updateAccountSheetCloseLabel() {
  accountSheetClose.setAttribute("aria-label", `关闭${accountSheetTitle.textContent.trim()}`);
}
const accountContent = {
  orders: [["炎柱果饮纪念徽章", "待发货", "¥29.9"], ["柱集结限定摆件", "待收货", "¥129"], ["蜜璃亚克力立牌", "待付款", "¥39"]],
  records: Array.isArray(demoTransactionState.records) ? demoTransactionState.records.slice(0, 120) : [["炎柱纪念卡包", "抽 1 包", "今日 18:24"], ["柱集合赏", "一番赏", "昨日 21:08"]],
  coupons: [["新人满减券", "满 99 减 15", "7 天后到期"], ["包邮券", "全场可用", "30 天后到期"]],
  "after-sale": [["售后进度", "暂无进行中的售后", "已提交的申请会在此展示"], ["破损补寄", "签收后 48 小时内", "请保留外箱并上传开箱凭证"], ["退款说明", "按商品规则处理", "抽赏结果生成后不支持无理由取消"]],
  support: [["在线客服", "工作日 09:00–21:00", "当前可咨询"], ["订单问题", "提交订单号", "客服将在 10 分钟内响应"], ["售后专线", "400-826-2026", "工作日 09:00–18:00"]],
  invite: [["邀请有礼", "每邀请 1 位好友得 20 积分", "分享码 GUJI2026"], ["本月进度", "已邀请 2 人", "再邀请 1 人可额外获得 30 积分"]],
  privacy: [["个性化推荐", "已开启", "根据浏览与收藏优化推荐"], ["消息通知", "交易通知已开启", "营销通知保持关闭"], ["账号安全", "安全等级良好", "手机号 138****8266 已绑定"]],
  about: [["谷多多", "正版 IP 收藏与抽赏平台", "版本 2.1"], ["用户协议与隐私政策", "2026-08-01 更新", "可在设置中随时查阅"], ["经营资质", "平台资质已公示", "正版授权信息随商品展示"]],
};

function renderAccountAddresses() {
  accountSheetTitle.textContent = "收货地址";
  updateAccountSheetCloseLabel();
  accountSheet.classList.remove("is-address-form");
  accountSheetList.innerHTML = `
    <div class="account-address-list" role="radiogroup" aria-label="选择收货地址">
      ${deliveryAddresses.map((address) => {
        const selected = address.id === pendingAccountAddressId;
        const stateLabel = selected
          ? address.id === activeAddressId
            ? address.isDefault ? "当前·默认" : "当前使用"
            : "已选择"
          : address.isDefault ? "默认" : address.label;
        return `<button class="account-address-card${selected ? " is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-account-address="${escapeHtml(address.id)}">
          <i class="account-address-check" aria-hidden="true">✓</i>
          <span class="account-address-copy"><strong>${escapeHtml(address.name)}<em>${escapeHtml(address.phone)}</em></strong><small>${escapeHtml(address.address)}</small></span>
          <b class="account-address-tag">${escapeHtml(stateLabel)}</b>
        </button>`;
      }).join("")}
    </div>
    <button class="account-address-add" type="button" data-add-account-address><span aria-hidden="true">＋</span>新增收货地址</button>
    <button class="account-address-confirm" type="button" data-confirm-account-address>使用该地址</button>
    <p class="account-address-hint">确认后将同步到商品配送信息和结算订单。</p>`;
}

function renderAddressForm() {
  accountSheetTitle.textContent = "新增收货地址";
  updateAccountSheetCloseLabel();
  accountSheet.classList.add("is-address-form");
  accountSheetList.innerHTML = `
    <form class="account-address-form" data-account-address-form novalidate>
      <div class="account-address-form-row">
        <label><span>收货人</span><input name="recipient" type="text" maxlength="12" autocomplete="name" placeholder="请输入姓名" /></label>
        <label><span>手机号码</span><input name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="11 位手机号" /></label>
      </div>
      <label><span>所在地区</span><select name="district"><option value="上海市徐汇区">上海市徐汇区</option><option value="上海市浦东新区">上海市浦东新区</option><option value="上海市静安区">上海市静安区</option><option value="上海市长宁区">上海市长宁区</option></select></label>
      <label><span>详细地址</span><input name="detail" type="text" maxlength="40" autocomplete="street-address" placeholder="街道、门牌号、小区及楼栋" /></label>
      <fieldset><legend>地址标签</legend><div class="account-address-labels"><label><input type="radio" name="label" value="家" checked /><span>家</span></label><label><input type="radio" name="label" value="公司" /><span>公司</span></label><label><input type="radio" name="label" value="学校" /><span>学校</span></label></div></fieldset>
      <label class="account-address-default"><input name="isDefault" type="checkbox" /><span>设为默认收货地址</span></label>
      <div class="account-address-form-actions"><button type="button" data-cancel-account-address>取消</button><button type="submit">保存并使用</button></div>
    </form>`;
  window.requestAnimationFrame(() => accountSheetList.querySelector("input[name='recipient']")?.focus());
}

function openAccountView(view, filter = "", trigger = document.activeElement) {
  const titles = { orders: "我的订单", prizes: "我的赏品", records: "抽赏记录", coupons: "我的优惠券", "after-sale": "售后服务", address: "收货地址", support: "客服中心", invite: "邀请有礼", privacy: "隐私设置", about: "关于我们" };
  accountSheetTitle.textContent = filter || titles[view] || "个人中心";
  updateAccountSheetCloseLabel();
  accountSheet.classList.toggle("is-address-view", view === "address");
  if (view === "address") {
    pendingAccountAddressId = activeAddressId;
    renderAccountAddresses();
    openDialog(accountSheet, trigger);
    return;
  }
  let rows;
  if (view === "prizes") rows = [
    ...wonPrizes.map((prize) => [prize.name, "已入赏品柜", "1 件 · 可申请合并发货"]),
    ["炼狱杏寿郎 · 果饮徽章", "已入赏品柜", "1 件 · 可申请发货"],
    ["蜜璃亚克力立牌", "待收货", "1 件 · 查看物流"],
  ];
  else rows = accountContent[view] || [["暂无内容", "稍后再来看看", "暂无更多数据"]];
  if (view === "orders" && filter) rows = rows.filter((row) => row[1] === filter);
  accountSheetList.innerHTML = rows.map((row) => `<article><strong>${row[0]}</strong><span>${row[1]}</span><small>${row[2]}</small></article>`).join("");
  openDialog(accountSheet, trigger);
}

accountSheetList.addEventListener("click", (event) => {
  if (event.target.closest("[data-add-account-address]")) {
    renderAddressForm();
    return;
  }
  if (event.target.closest("[data-cancel-account-address]")) {
    pendingAccountAddressId = activeAddressId;
    renderAccountAddresses();
    accountSheetList.querySelector("[data-add-account-address]")?.focus();
    return;
  }
  const addressButton = event.target.closest("[data-account-address]");
  if (addressButton) {
    pendingAccountAddressId = addressButton.dataset.accountAddress;
    renderAccountAddresses();
    accountSheetList.querySelector(`[data-account-address='${pendingAccountAddressId}']`)?.focus();
    return;
  }
  if (event.target.closest("[data-confirm-account-address]")) {
    useDeliveryAddress(pendingAccountAddressId, false);
    const address = activeDeliveryAddress();
    closeDialog();
    showToast(`已使用${address.label}地址，配送信息已更新`);
  }
});

accountSheetList.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-account-address-form]");
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  const name = String(formData.get("recipient") || "").trim();
  const phone = String(formData.get("phone") || "").replace(/\D/g, "");
  const district = String(formData.get("district") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const label = String(formData.get("label") || "家");
  const isDefault = formData.get("isDefault") === "on";
  if (!name) {
    form.elements.recipient.focus();
    return showToast("请填写收货人姓名");
  }
  if (!/^1\d{10}$/.test(phone)) {
    form.elements.phone.focus();
    return showToast("请输入正确的 11 位手机号");
  }
  if (detail.length < 4) {
    form.elements.detail.focus();
    return showToast("请填写完整的详细地址");
  }
  if (isDefault) deliveryAddresses.forEach((address) => (address.isDefault = false));
  const address = {
    id: `custom-${Date.now().toString(36)}`,
    label,
    name,
    phone: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
    district,
    address: `${district}${detail}`,
    isDefault,
  };
  deliveryAddresses.push(address);
  pendingAccountAddressId = address.id;
  useDeliveryAddress(address.id, false);
  closeDialog();
  showToast("新地址已保存并使用");
});

function openDrawInfo(view, trigger) {
  const pack = currentDrawPack();
  const configurations = {
    probability: {
      title: `${pack.name} · 概率公示`,
      rows: pack.catalog.map((prize) => [prize.name, `${prize.weight}%`, `${prize.rarity} · 每包独立随机`]),
    },
    catalog: {
      title: `${pack.name} · 赏品一览`,
      rows: pack.catalog.map((prize, index) => [prize.name, prize.rarity, `款式 ${index + 1}/${pack.catalog.length} · 抽中后存入赏品柜`]),
    },
    details: {
      title: `${pack.name} · 商品详情`,
      rows: [["正版授权卡包", pack.ip, `全系列 ${pack.catalog.length} 款，单包随机 1 款`], ["发货说明", "现货", "预计 3–5 个工作日发出"], ["售后规则", "破损补寄", "抽取结果生成后不支持无理由取消"]],
    },
    benefits: {
      title: "当前可用福利",
      rows: [["整盒组合优惠", "立减 ¥4", "6 包原价 ¥120，组合价 ¥116"], ["多包优惠", "立减 ¥2", "3 包原价 ¥60，组合价 ¥58"], ["满额包邮", "满 ¥99", "同一订单现货商品可合并发货"]],
    },
    collection: {
      title: `${pack.name} · 系列图鉴`,
      rows: pack.catalog.map((prize, index) => [prize.name, index < Math.min(2, pack.catalog.length) ? "已点亮" : "待收集", `${prize.rarity} · ${index + 1}/${pack.catalog.length}`]),
    },
  };
  const configuration = configurations[view];
  if (!configuration) return;
  accountContent[`draw-${view}`] = configuration.rows;
  openAccountView(`draw-${view}`, configuration.title, trigger);
}

document.querySelectorAll("[data-draw-info]").forEach((button) => button.addEventListener("click", () => openDrawInfo(button.dataset.drawInfo, button)));
document.querySelector("[data-preview-card]").addEventListener("click", (event) => openDrawInfo("catalog", event.currentTarget));
document.querySelector("[data-draw-share]").addEventListener("click", async () => {
  const shareUrl = `${window.location.href.split("#")[0]}#draw/${activeDrawPackId}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast("卡包链接已复制");
  } catch {
    showToast("分享链接已生成");
  }
});

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

window.addEventListener("hashchange", () => {
  if (drawPaymentPending) {
    cancelDrawTransaction();
    closeDialog({ restoreFocus: false, force: true, updateHistory: false });
    showToast("页面已切换，本次支付已取消");
  }
  routeFromHash();
});
window.addEventListener("popstate", (event) => {
  if (activeDialog === drawConfirmSheet && drawConfirmHistoryOpen) {
    const completed = completedDrawAfterHistory;
    completedDrawAfterHistory = null;
    cancelDrawTransaction({ clearOrder: true });
    closeDialog({ restoreFocus: !completed, force: true, updateHistory: false });
    if (completed) window.requestAnimationFrame(() => renderResult(completed.draw, completed.prizes));
    return;
  }
  if (drawPaymentPending) {
    cancelDrawTransaction();
    closeDialog({ restoreFocus: false, force: true, updateHistory: false });
  }
  if (productDetailOpen) {
    closeProductDetail({ updateHistory: false });
    return;
  }
  if (event.state?.productDetail) {
    const product = productCatalog.find((item) => item.id === event.state.productDetail);
    if (product) openProductDetail(product, product.card, { pushHistory: false });
    return;
  }
  routeFromHash({ instant: true });
});
window.addEventListener("load", () => {
  if (window.location.hash === "#draw") window.history.replaceState(null, "", "#draw/flame-pack");
  const recordCount = document.querySelector("[data-record-count]");
  if (recordCount) recordCount.textContent = String(accountContent.records.length);
  renderMinePrizeCabinet();
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
