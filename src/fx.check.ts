// npm run check — 계산기·만단위 표기가 깨지면 여기서 멈춘다.
import assert from "node:assert/strict";
import { EMPTY, korean, press, roughly, type Key } from "./fx.ts";

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

console.log("fx ok");
