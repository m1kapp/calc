#!/usr/bin/env node
// 나라별 애플 공식 스토어에서 최신 아이폰 Pro 의 가장 싼 용량 가격을 받아 src/iphone.ts 에 쓴다.
// 화면에서 바로 못 받는다(apple.com 은 CORS 를 안 연다) — 새 모델이 나오거나 값이 바뀌면 이걸 다시 돌린다.
// 사용: node scripts/iphone.mjs iphone-18-pro "아이폰 18 Pro"
import fs from "node:fs";

const [slug = "iphone-18-pro", name = "아이폰 18 Pro"] = process.argv.slice(2);
// 통화 → 애플 스토어 경로. 유로는 프랑스 판(나라마다 조금씩 다르다), 미국은 세금 별도 가격이다
const STORE = { KRW: "kr", JPY: "jp", CNY: "cn", VND: "vn", THB: "th", PHP: "ph", TWD: "tw", USD: "", HKD: "hk", SGD: "sg",
  MYR: "my", IDR: "id", AUD: "au", CAD: "ca", EUR: "fr", GBP: "uk", CHF: "ch-de", INR: "in", MXN: "mx" };

const out = { date: new Date().toISOString().slice(0, 10), model: name, KRW: 0, local: {} };
for (const [cur, cc] of Object.entries(STORE)) {
  const url = `https://www.apple.com${cc ? `/${cc}` : ""}/shop/buy-iphone/${slug}`;
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Macintosh) Chrome/130" } });
  const html = res.ok ? await res.text() : "";
  // 용량·색별 가격이 currentPrice 로 다 들어 있다 — 가장 싼 것이 기본 용량
  const prices = [...html.matchAll(/"currentPrice":\{"amount":"[^"]*","raw_amount":"([\d.]+)"/g)].map((m) => +m[1]);
  if (!prices.length) { console.log(`${cur} 없음 (${res.status} ${url})`); continue; }
  const min = Math.min(...prices);
  if (cur === "KRW") out.KRW = min; else out.local[cur] = min;
  console.log(cur, min);
}
if (!out.KRW) throw new Error("한국 가격을 못 받았어요");
// .ts 로 쓴다 — JSON import 는 vite·tsc·node 검사 설정이 저마다 달라서
fs.writeFileSync(new URL("../src/iphone.ts", import.meta.url),
  `// scripts/iphone.mjs 가 만든 파일 — 손으로 고치지 말고 다시 돌린다. 애플 공식 스토어 가격, 미국은 세금 별도\nexport const IPHONE = ${JSON.stringify(out, null, 2)};\n`);
console.log(`→ src/iphone.ts (${Object.keys(out.local).length}개국)`);
