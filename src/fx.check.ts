// npm run check — 계산기·만단위 표기가 깨지면 여기서 멈춘다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bigmac, BIGMAC, EMPTY, monthLabel, parseBigmac, korean, press, roughly, type Key } from "./fx.ts";

const run = (...keys: Key[]) => keys.reduce(press, EMPTY).cur;

assert.equal(korean(1300000), "130만");
assert.equal(korean(67000), "6만 7,000");
assert.equal(korean(123456789), "1억 2,345만 6,789");
assert.equal(korean(9999), "");

assert.equal(run("1", "3", "000", "0"), "130000");
assert.equal(run("1", "+", "2", "×", "3", "="), "9");
assert.equal(run("5", "0", "÷", "4", "="), "12.5");
assert.equal(run("9", "+", "1", "=", "7"), "7"); // = 뒤 숫자는 새로 시작
assert.equal(run("1", ".", ".", "5"), "1.5");
assert.equal(run("1", "2", "back"), "1");
assert.equal(run("7", "÷", "0", "="), "0");

assert.equal(roughly(193050), 200000);
assert.equal(roughly(1183.3), 1200);
assert.equal(roughly(59.2), 60);
assert.equal(roughly(7.1), 8);

const vn = bigmac("VND", 0.0513)!;
assert.equal(Math.round(vn.krw), 3899);
assert.equal(vn.diff, -32);
assert.equal(bigmac("XXX", 1), null);

// 내려받은 원본 CSV 를 넣으면 들고 있는 사본과 같은 값이 나와야 한다(npm run check 전에 받아 둔다)
const csv = process.env.BIGMAC_CSV && readFileSync(process.env.BIGMAC_CSV, "utf8");
if (csv) {
  const t = parseBigmac(csv);
  assert.equal(t.KRW, BIGMAC.KRW);
  for (const [k, v] of Object.entries(BIGMAC.local)) assert.equal(t.local[k], v, k);
}
assert.deepEqual(parseBigmac("h\nKorea,KOR,KRW,5000,,,,2025-01-01\nKorea,KOR,KRW,5700,,,,2026-07-01\nGermany,DEU,EUR,6.99,,,,2026-07-01\nEuro area,EUZ,EUR,6.19,,,,2026-07-01"),
  { date: "2026-07-01", KRW: 5700, local: { EUR: 6.19 } });
assert.equal(monthLabel("2026-07-01"), "2026년 7월");

console.log("fx ok");
