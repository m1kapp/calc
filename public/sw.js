// m1kkit pwa 가 만든 파일 — 오프라인에서도 앱이 열리게 한다. 다시 만들려면 npx m1kkit pwa
// 페이지: 네트워크 먼저, 3초 안에 안 오거나 끊겨 있으면 저장본(여행지 로밍처럼 느린 망에서도 바로 뜬다).
//   그래서 새 배포는 온라인이면 다음 실행에 바로 보인다. 이 파일은 배포마다 바꿀 필요가 없다.
// JS·CSS·폰트·이미지: 저장본을 바로 주고 뒤에서 새로 받아 둔다. API(fetch) 요청은 건드리지 않는다.
// ponytail: 캐시 이름이 하나라 배포마다 옛 해시 파일이 조금씩 쌓인다 — 커지면 savePage 에서 안 쓰는 것 정리
const CACHE = "m1kkit-pwa";
const ASSET = ["script", "style", "font", "image", "manifest"];

// SPA 호스팅(Vercel rewrites 등)은 없는 파일에도 index.html 을 200 으로 준다.
// 그걸 JS 자리에 담으면 다음 오프라인 실행이 하얗게 뜬다 — 페이지가 아닌데 HTML 이면 안 담는다.
const keepable = (req, res) => res.type === "opaque" ||
  (res.ok && (req.mode === "navigate" || !(res.headers.get("content-type") ?? "").includes("text/html")));

// 페이지는 그 페이지가 부르는 JS·CSS 를 다 담은 뒤에 담는다 — 저장된 페이지가 없는 파일을 가리키는 순간이 없게.
// 하나라도 못 받으면 페이지는 옛 판을 그대로 둔다(옛 판의 파일은 남아 있다).
async function savePage(c, key, res) {
  const html = await res.clone().text();
  const own = [...html.matchAll(/(?:src|href)="(\/[^"/][^"]*)"/g)].map((m) => new Request(m[1]));
  // CDN 폰트 CSS 도(Pretendard·Tossface 같은) — 빠지면 오프라인에서 글꼴·국기 이모지가 바뀐다. 실패해도 페이지는 담는다
  const cdn = [...html.matchAll(/href="(https:\/\/[^"]+\.css)"/g)].map((m) => new Request(m[1], { mode: "no-cors" }));
  const got = (req) => c.match(req, { ignoreVary: true }).then(async (hit) => {
    if (hit) return true;
    const r = await fetch(req).catch(() => null); // add() 는 opaque 를 거절해서 직접 담는다
    return !!r && keepable(req, r) && c.put(req, r).then(() => true);
  });
  const ok = await Promise.all(own.map(got));
  await Promise.all(cdn.map(got));
  if (ok.every(Boolean)) await c.put(key, res);
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const res = await fetch("/", { cache: "no-store" });
    if (res.ok) await savePage(await caches.open(CACHE), "/", res);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || !r.url.startsWith("http")) return;
  if (r.mode === "navigate") {
    const net = fetch(r);
    // 복사는 응답이 화면으로 가기 전에, 같은 차례에서 — 늦으면 body already used
    e.waitUntil(net.then((res) => { if (!res.ok) return; const copy = res.clone(); return caches.open(CACHE).then((c) => savePage(c, r, copy)); }).catch(() => {}));
    return e.respondWith(page(r, net));
  }
  const same = new URL(r.url).origin === location.origin;
  if (same ? ASSET.includes(r.destination) : r.destination === "style" || r.destination === "font") e.respondWith(stale(r));
});

async function page(r, net) {
  const c = await caches.open(CACHE);
  const saved = () => c.match(r, { ignoreSearch: true, ignoreVary: true }).then((m) => m ?? c.match("/"));
  const slow = new Promise((ok) => setTimeout(ok, 3000)).then(async () => (await saved()) ?? net);
  try { return await Promise.race([net, slow]); } catch { return (await saved()) ?? Response.error(); }
}

async function stale(r) {
  const c = await caches.open(CACHE);
  const hit = await c.match(r, { ignoreVary: true }); // Vary: Origin 서버에서 저장본을 못 찾던 것
  const net = fetch(r).then((res) => { if (keepable(r, res)) c.put(r, res.clone()); return res; });
  if (!hit) return net;
  net.catch(() => {});
  return hit;
}
