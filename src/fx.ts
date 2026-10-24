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

// 빅맥 현지 가격 — The Economist Big Mac index (MIT, github.com/TheEconomist/big-mac-data)
// 같은 물건 하나로 그 나라 물가를 가늠한다. 반년마다 새 판이 나오니 화면은 원본 CSV 를 직접 받아 쓰고,
// 아래 숫자는 못 받았을 때 쓰는 2026-07-01 판 사본이다.
export type BigMac = { date: string; KRW: number; local: Record<string, number> };
export const BIGMAC: BigMac = {
  date: "2026-07-01",
  KRW: 5700,
  local: { JPY: 500, VND: 76000, USD: 6.22, TWD: 78, THB: 135, HKD: 25.5, CNY: 26.5, PHP: 169, SGD: 7.45,
    IDR: 43000, EUR: 6.19, GBP: 5.49, AUD: 8.5, CHF: 7.3, MYR: 14.55, MXN: 109, INR: 236.25 },
};
export const BIGMAC_CSV = "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/source-data/big-mac-source-data-v2.csv";

// 통화마다 가장 최근 행을 쓴다. 유로는 나라별 가격이 따로 있어 유로존 평균(EUZ)만 본다.
export function parseBigmac(csv: string): BigMac {
  const t: BigMac = { date: "", KRW: 0, local: {} };
  const seen: Record<string, string> = {};
  for (const line of csv.trim().split("\n").slice(1)) {
    const [, iso, cur, price, , , , date] = line.split(",");
    if (cur === "EUR" && iso !== "EUZ") continue;
    if ((seen[cur] ?? "") > date) continue;
    seen[cur] = date;
    if (cur === "KRW") t.KRW = +price;
    else t.local[cur] = +price;
    if (date > t.date) t.date = date;
  }
  if (!t.KRW) throw new Error("빅맥 표에 한국이 없어요");
  return t;
}
export const fetchBigmac = () => fetch(BIGMAC_CSV).then((r) => r.text()).then(parseBigmac);

// "2026-07-01" → "2026년 7월"
export const monthLabel = (d: string) => `${d.slice(0, 4)}년 ${+d.slice(5, 7)}월`;

// 그 나라 빅맥을 원화로 바꾼 값과 한국 대비 비율(-32 = 32% 싸다)
export function bigmac(code: string, krwPer: number, t: BigMac = BIGMAC) {
  const local = t.local[code];
  if (!local || !krwPer) return null;
  const krw = local * krwPer;
  return { local, krw, diff: Math.round((krw / t.KRW - 1) * 100) };
}

// 물가 수준 — 세계은행 가계소비 PPP 환산계수(PA.NUS.PRVT.PP, 현지 통화 / 국제달러).
// 오늘 환율과 나누면 "같은 장바구니가 한국의 몇 %"가 된다. 매년 갱신 — 화면은 API 를 직접 받고, 아래는 2025년 사본.
// 대만(세계은행 비회원)과 유로존(최신값 비어 있음)은 없다.
// ponytail: 2021 국제비교(ICP) 조사를 세계은행이 이어서 추정한 값이라 "대략"으로만 쓴다.
export type Ppp = { year: string; KRW: number; local: Record<string, number> };
const WB_ISO: Record<string, string> = { KRW: "KOR", JPY: "JPN", VND: "VNM", USD: "USA", THB: "THA", HKD: "HKG", CNY: "CHN",
  PHP: "PHL", SGD: "SGP", IDR: "IDN", GBP: "GBR", AUD: "AUS", CHF: "CHE", MYR: "MYS", MXN: "MEX", INR: "IND" };
export const PPP: Ppp = {
  year: "2025",
  KRW: 880.1254,
  local: { AUD: 1.4646, CHF: 1.0655, CNY: 3.4596, GBP: 0.7015, HKD: 5.7676, IDR: 5065.969, INR: 19.8389, JPY: 103.3366,
    MXN: 11.3088, MYR: 1.4306, PHP: 20.5335, SGD: 1.0238, THB: 10.6063, USD: 1, VND: 7203.3696 },
};
export function parsePpp(rows: { countryiso3code: string; date: string; value: number | null }[]): Ppp {
  const t: Ppp = { year: "", KRW: 0, local: {} };
  for (const [cur, iso] of Object.entries(WB_ISO)) {
    const r = rows.find((x) => x.countryiso3code === iso && x.value);
    if (!r) continue;
    if (cur === "KRW") t.KRW = r.value!;
    else t.local[cur] = r.value!;
    if (r.date > t.year) t.year = r.date;
  }
  if (!t.KRW) throw new Error("물가표에 한국이 없어요");
  return t;
}
export const fetchPpp = () =>
  fetch(`https://api.worldbank.org/v2/country/${Object.values(WB_ISO).join(";")}/indicator/PA.NUS.PRVT.PP?format=json&mrnev=1&per_page=100`)
    .then((r) => r.json()).then((d) => parsePpp(d[1]));

// 한국 = 100 일 때 그 나라 물가(42 = 한국의 42%)
export function priceLevel(code: string, krwPer: number, t: Ppp = PPP) {
  const local = t.local[code];
  return local && krwPer ? Math.round((local * krwPer / t.KRW) * 100) : null;
}

// "vnd" → "VND", 모르는 코드는 null
export const findCode = (s: string) => CURRENCIES.find((c) => c.code === s.toUpperCase())?.code ?? null;
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
