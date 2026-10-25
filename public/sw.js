// m1kkit pwa 가 만든 파일 — 오프라인에서도 앱이 열리게 한다. 다시 만들려면 npx m1kkit pwa
// 페이지: 네트워크 먼저, 3초 안에 안 오거나 끊겨 있으면 저장본(여행지 로밍처럼 느린 망에서도 바로 뜬다).
// JS·CSS·폰트·이미지: 저장본을 바로 주고 뒤에서 새로 받아 둔다. API(fetch) 요청은 건드리지 않는다.
// ponytail: 캐시 이름이 하나라 배포마다 옛 해시 파일이 조금씩 쌓인다 — 커지면 activate 에서 정리
const CACHE = "m1kkit-pwa";
const ASSET = ["script", "style", "font", "image", "manifest"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const res = await fetch("/", { cache: "no-store" });
    await c.put("/", res.clone());
    // 첫 방문에 이미 받은 JS·CSS 도 담아 둔다 — 두 번째 실행이 바로 오프라인이어도 뜨게
    const html = await res.text();
    const urls = [...html.matchAll(/(?:src|href)="(\/[^"/][^"]*)"/g)].map((m) => m[1]);
    // CDN 폰트 CSS 도(Pretendard·Tossface 같은) — 이게 빠지면 오프라인에서 글꼴·국기 이모지가 바뀐다
    const css = [...html.matchAll(/href="(https:\/\/[^"]+\.css)"/g)].map((m) => new Request(m[1], { mode: "no-cors" }));
    await Promise.all([...urls, ...css].map((u) => fetch(u).then((r) => (r.ok || r.type === "opaque") && c.put(u, r)).catch(() => {}))); // add() 는 opaque 를 거절한다
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || !r.url.startsWith("http")) return;
  if (r.mode === "navigate") return e.respondWith(page(r));
  const same = new URL(r.url).origin === location.origin;
  if (same ? ASSET.includes(r.destination) : r.destination === "style" || r.destination === "font") e.respondWith(stale(r));
});

async function page(r) {
  const c = await caches.open(CACHE);
  const saved = () => c.match(r, { ignoreSearch: true, ignoreVary: true }).then((m) => m ?? c.match("/"));
  const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; });
  const slow = new Promise((ok) => setTimeout(ok, 3000)).then(async () => (await saved()) ?? net);
  try { return await Promise.race([net, slow]); } catch { return (await saved()) ?? Response.error(); }
}

async function stale(r) {
  const c = await caches.open(CACHE);
  const hit = await c.match(r, { ignoreVary: true }); // Vary: Origin 서버에서 저장본을 못 찾던 것
  const net = fetch(r).then((res) => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; });
  if (!hit) return net;
  net.catch(() => {});
  return hit;
}
