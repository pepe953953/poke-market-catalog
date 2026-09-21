#!/usr/bin/env node
/**
 * Build a linked multi-page site from the three exported Stitch screens.
 *
 *   src/catalog.html        -> index.html
 *   src/product-detail.html -> product-detail/index.html
 *   src/cart.html           -> cart/index.html
 *
 * Each page gets a shared floating navigation pill (relative links, so the
 * site also works from a GitHub Pages project sub-path) plus small scripts
 * that wire the in-page elements to the other screens.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (p, data) => {
  const target = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data, "utf8");
  console.log("wrote " + p + " (" + data.length + " bytes)");
};

const BASE_CSS = `<style id="stitch-multipage-style">
  body { padding-bottom: 6rem; }
  .snav {
    position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%);
    z-index: 2147483000; display: flex; gap: .25rem; align-items: center;
    background: #1e1b18; color: #fff8f5; border-radius: 9999px; padding: .375rem;
    box-shadow: 0 12px 30px -6px rgba(30, 27, 24, .45);
    font-family: 'Plus Jakarta Sans', Pretendard, 'Noto Sans KR', system-ui, -apple-system, sans-serif;
  }
  .snav a {
    display: inline-flex; align-items: center; gap: .375rem;
    padding: .5rem .875rem; border-radius: 9999px;
    font-size: .8125rem; font-weight: 700; line-height: 1;
    text-decoration: none; color: #e9e1dc; white-space: nowrap;
    transition: background-color .18s ease, color .18s ease;
  }
  .snav a:hover { background: rgba(255, 255, 255, .10); color: #fff; }
  .snav a[aria-current="page"] { background: #fdc220; color: #251a00; }
  @media (max-width: 420px) { .snav a { padding: .5rem .625rem; font-size: .75rem; } }
</style>`;

function navBar(links) {
  const item = (l) =>
    `  <a href="${l.href}"${l.current ? ' aria-current="page"' : ""}>${l.label}</a>`;
  return `<nav class="snav" aria-label="화면 이동">\n${links.map(item).join("\n")}\n</nav>`;
}

const CATALOG_SCRIPT = `<script id="stitch-multipage-catalog">
(function () {
  function go(u) { window.location.href = u; }
  var grid = document.getElementById('product-grid');
  if (grid) {
    Array.prototype.forEach.call(grid.children, function (card) {
      if (!card.classList || !card.classList.contains('group')) return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('button,a,input,label,select,textarea')) return;
        go('product-detail/');
      });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.material-symbols-outlined'), function (ic) {
    var t = (ic.textContent || '').trim();
    if (t === 'shopping_bag' || t === 'add_shopping_cart') {
      var b = ic.closest('button,a') || ic;
      b.style.cursor = 'pointer';
      b.addEventListener('click', function (ev) { ev.preventDefault(); go('cart/'); });
    }
  });
})();
</script>`;

const DETAIL_SCRIPT = `<script id="stitch-multipage-detail">
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('button,a'), function (el) {
    var t = (el.textContent || '').replace(/\\s+/g, '');
    if (t.indexOf('장바구니') >= 0 || t.indexOf('바로구매') >= 0 || t.indexOf('구매하기') >= 0) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (ev) { ev.preventDefault(); window.location.href = '../cart/'; });
    }
  });
})();
</script>`;

const CART_SCRIPT = `<script id="stitch-multipage-cart">
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.material-symbols-outlined'), function (ic) {
    var t = (ic.textContent || '').trim();
    if (t === 'shopping_bag') {
      var b = ic.closest('button,a') || ic;
      b.style.cursor = 'pointer';
      b.addEventListener('click', function (ev) { ev.preventDefault(); window.location.href = '../'; });
    }
  });
})();
</script>`;

/** Inject the shared nav + style right after <body ...> and the page script before </body>. */
function decorate(html, { label, links, script }, requiredMarker) {
  if (!html.includes(requiredMarker)) {
    throw new Error(label + ": expected marker not found -> " + requiredMarker);
  }
  const bodyOpen = html.match(/<body[^>]*>/);
  if (!bodyOpen) throw new Error(label + ": <body> not found");
  html = html.replace(bodyOpen[0], bodyOpen[0] + "\n" + BASE_CSS + "\n" + navBar(links) + "\n");

  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) throw new Error(label + ": </body> not found");
  html = html.slice(0, bodyClose) + script + "\n" + html.slice(bodyClose);
  return html;
}

// ---------------------------------------------------------------- catalog
let catalog = read("src/catalog.html");
const GRID_OPEN =
  '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">';
if (!catalog.includes(GRID_OPEN)) throw new Error("catalog: product grid markup not found");
catalog = catalog.replace(GRID_OPEN, GRID_OPEN.replace("<div ", '<div id="product-grid" '));
catalog = decorate(
  catalog,
  {
    label: "catalog",
    links: [
      { label: "카탈로그", href: "./", current: true },
      { label: "상품 상세", href: "product-detail/" },
      { label: "장바구니·결제", href: "cart/" },
    ],
    script: CATALOG_SCRIPT,
  },
  "잠자는 파이리 포근 쿠션"
);

// ---------------------------------------------------------- product detail
let detail = read("src/product-detail.html");
detail = decorate(
  detail,
  {
    label: "product-detail",
    links: [
      { label: "카탈로그", href: "../" },
      { label: "상품 상세", href: "./", current: true },
      { label: "장바구니·결제", href: "../cart/" },
    ],
    script: DETAIL_SCRIPT,
  },
  "PokeMarket"
);

// ------------------------------------------------------------------- cart
let cart = read("src/cart.html");
cart = decorate(
  cart,
  {
    label: "cart",
    links: [
      { label: "카탈로그", href: "../" },
      { label: "상품 상세", href: "../product-detail/" },
      { label: "장바구니·결제", href: "./", current: true },
    ],
    script: CART_SCRIPT,
  },
  "장바구니"
);

write("index.html", catalog);
write("product-detail/index.html", detail);
write("cart/index.html", cart);
console.log("done.");
