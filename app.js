const scrollView = document.querySelector("#scrollView");
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function scrollToTarget(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = id === "top" ? 0 : target.offsetTop - 160;
  scrollView.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

document.querySelectorAll("[data-toast]").forEach((control) => {
  control.addEventListener("click", () => showToast(control.dataset.toast));
});

document.querySelectorAll("[data-target]").forEach((control) => {
  control.addEventListener("click", () => scrollToTarget(control.dataset.target));
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

document.querySelectorAll(".bottom-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".bottom-item").forEach((navItem) => {
      navItem.classList.toggle("is-active", navItem === item);
      navItem.removeAttribute("aria-current");
    });
    item.setAttribute("aria-current", "page");
    showToast(`已进入${item.dataset.nav}`);
  });
});

document.querySelectorAll(".product-card").forEach((card) => {
  const openProduct = () => showToast(`查看商品：${card.dataset.product}`);
  card.addEventListener("click", openProduct);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct();
    }
  });
});

document.querySelector("#searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#searchInput").value.trim();
  showToast(query ? `搜索「${query}」` : "请输入 IP、角色或卡包");
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { root: scrollView, threshold: 0.08 }
);

document.querySelectorAll(".reveal").forEach((section) => revealObserver.observe(section));

window.addEventListener("load", () => {
  document.querySelectorAll(".reveal").forEach((section, index) => {
    if (section.getBoundingClientRect().top < window.innerHeight) {
      window.setTimeout(() => section.classList.add("is-visible"), index * 70);
    }
  });
});
