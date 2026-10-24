// 통화 목록 · 환율 · 계산기 상태. 화면과 무관한 순수 로직만 둔다(fx.check.ts 가 검사).

export type Currency = { code: string; name: string; unit: string; flag: string; per: 1 | 100 };

// per: 화면에 "100 VND = 5원"처럼 몇 단위 기준으로 보여 줄지. 단위가 작은 통화는 100.
export const CURRENCIES: Currency[] = [
  { code: "JPY", name: "일본", unit: "엔", flag: "🇯🇵", per: 100 },
  { code: "VND", name: "베트남", unit: "동", flag: "🇻🇳", per: 100 },
  { code: "USD", name: "미국", unit: "달러", flag: "🇺🇸", per: 1 },
  { code: "TWD", name: "대만", unit: "달러", flag: "🇹🇼", per: 1 },
  { code: "THB", name: "태국", unit: "바트", flag: "🇹🇭", per: 1 },
  { code: "HKD", name: "홍콩", unit: "달러", flag: "🇭🇰", per: 1 },
  { code: "CNY", name: "중국", unit: "위안", flag: "🇨🇳", per: 1 },
  { code: "PHP", name: "필리핀", unit: "페소", flag: "🇵🇭", per: 1 },
  { code: "SGD", name: "싱가포르", unit: "달러", flag: "🇸🇬", per: 1 },
  { code: "IDR", name: "인도네시아", unit: "루피아", flag: "🇮🇩", per: 100 },
  { code: "EUR", name: "유럽", unit: "유로", flag: "🇪🇺", per: 1 },
  { code: "GBP", name: "영국", unit: "파운드", flag: "🇬🇧", per: 1 },
  { code: "AUD", name: "호주", unit: "달러", flag: "🇦🇺", per: 1 },
  { code: "CHF", name: "스위스", unit: "프랑", flag: "🇨🇭", per: 1 },
  { code: "MYR", name: "말레이시아", unit: "링깃", flag: "🇲🇾", per: 1 },
  { code: "MXN", name: "멕시코", unit: "페소", flag: "🇲🇽", per: 1 },
  { code: "INR", name: "인도", unit: "루피", flag: "🇮🇳", per: 1 },
];

export const findCurrency = (code: string) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

// 원 기준 환율표 → "1 단위 = 몇 원". 하루 한 번 갱신되는 무료 공개 API(키 없음, CORS 허용).
// ponytail: 은행 고시환율이 아니라 시장 중간값이다. 환전소 환율은 "직접입력"으로 덮는다.
export type Rates = { krwPer: Record<string, number>; updatedAt: string };
export async function fetchRates(): Promise<Rates> {
  const res = await fetch("https://open.er-api.com/v6/latest/KRW");
  const d = await res.json();
  if (d.result !== "success") throw new Error("환율을 못 받았어요");
  const krwPer: Record<string, number> = {};
  for (const c of CURRENCIES) if (d.rates[c.code]) krwPer[c.code] = 1 / d.rates[c.code];
  return { krwPer, updatedAt: new Date(d.time_last_update_unix * 1000).toISOString() };
}

// 1,300,000 → "130만" · 67,000 → "6만 7,000" · 만 미만은 빈 문자열(숫자 그대로 읽힌다)
export function korean(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 10000) return "";
  const eok = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4), rest = n % 1e4;
  return [eok && `${eok.toLocaleString()}억`, man && `${man.toLocaleString()}만`, rest && rest.toLocaleString()]
    .filter(Boolean)
    .join(" ");
}

// 원화는 원 단위, 외화는 소수 둘째 자리까지
export const roundFor = (n: number, isKrw: boolean) => (isKrw ? Math.round(n) : Math.round(n * 100) / 100);

// 대충 기억하기 좋은 숫자로 올림: 앞 두 자리만 남긴다 (1,949 → 2,000 · 193,050 → 200,000 · 59.2 → 60)
export const roughly = (n: number) => {
  const tens = 10 ** Math.max(0, String(Math.floor(n)).length - 2);
  return Math.ceil(n / tens) * tens;
};

// 폰 계산기처럼 왼쪽부터 차례로 계산한다(1 + 2 × 3 = 9).
export type Op = "+" | "-" | "×" | "÷";
export type Calc = { cur: string; acc: number | null; op: Op | null; fresh: boolean };
export const EMPTY: Calc = { cur: "0", acc: null, op: null, fresh: false };

const apply = (a: number, op: Op, b: number) =>
  op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : b === 0 ? 0 : a / b;
const show = (n: number) => String(Math.round(n * 100) / 100);

export type Key = Op | "=" | "C" | "back" | "." | string;
export function press(s: Calc, key: Key): Calc {
  if (key === "C") return EMPTY;
  if (key === "back") return s.fresh ? s : { ...s, cur: s.cur.length > 1 ? s.cur.slice(0, -1) : "0" };
  if (key === "=") {
    if (s.acc === null || !s.op) return s;
    return { cur: show(apply(s.acc, s.op, +s.cur)), acc: null, op: null, fresh: true };
  }
  if (key === "+" || key === "-" || key === "×" || key === "÷") {
    if (s.acc !== null && s.op && !s.fresh) {
      const v = apply(s.acc, s.op, +s.cur);
      return { cur: show(v), acc: v, op: key, fresh: true };
    }
    return { ...s, acc: +s.cur, op: key, fresh: true };
  }
  // 숫자 · 00 · 000 · 소수점
  const base = s.fresh ? "0" : s.cur;
  if (key === ".") return base.includes(".") ? { ...s, fresh: false } : { ...s, cur: base + ".", fresh: false };
  const next = base === "0" ? String(+key) : base + key;
  if (next.replace(".", "").length > 12) return s;
  return { ...s, cur: next, fresh: false };
}

export const formatInput = (cur: string) => {
  const [i, f] = cur.split(".");
  return (+i).toLocaleString() + (f !== undefined ? "." + f : "");
};
