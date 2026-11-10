/* 板塊風向儀 service worker v0.7.3
 * 頁面本體 network-first（有網路就拿最新版，離線才用快取）——改版後不必再手動清快取。
 * 圖示/manifest cache-first。FMP / CFTC API 一律走網路、絕不快取（金融數據不能吃舊的）。 */
const CACHE = "windvane-v0.7.3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
const isHost = (h, d) => h === d || h.endsWith("." + d);
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (isHost(url.hostname, "financialmodelingprep.com") || isHost(url.hostname, "cftc.gov")) {
    return; // API 直接走網路
  }
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const put = res => { if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); } return res; };
  // ndc.json（景氣燈號）跟頁面一樣 network-first：每月更新後不能吃到舊的
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/ndc.json");
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(put)
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(put)));
});
