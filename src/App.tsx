import { useEffect, useState } from "react";
import { AppShell, AppShellContent, AppShellHeader, Dialog, ShareButton, ToastProvider, useLocalStorage, useToast, Watermark, watermarkTint } from "@m1kapp/kit";
import { BIGMAC, bigmac, CURRENCIES, EMPTY, fetchBigmac, fetchRates, monthLabel, type BigMac, findCurrency, formatInput, korean, press, roughly, roundFor, type Calc, type Key, type Rates } from "./fx";

const ACCENT = "#3b82f6";
// npx m1kkit track https://calc.m1k.app 로 발급받은 slug (Vite라 env 대신 prop)
const TRACK_SLUG = "gN";

export default function App() {
  return (
    <Watermark color={watermarkTint(ACCENT)} text="calc" trackSlug={TRACK_SLUG}>
      <AppShell accent={ACCENT}>
        <ToastProvider>
          <Calculator />
        </ToastProvider>
      </AppShell>
    </Watermark>
  );
}

function Calculator() {
  const [code, setCode] = useLocalStorage("calc:currency", "JPY");
  const [manual, setManual] = useLocalStorage<Record<string, number>>("calc:manual", {});
  const [cached, setCached] = useLocalStorage<Rates | null>("calc:rates", null);
  const [mactab, setMactab] = useLocalStorage<(BigMac & { at: number }) | null>("calc:bigmac", null);
  const [calc, setCalc] = useState<Calc>(EMPTY);
  const [krwFirst, setKrwFirst] = useState(false); // 위 칸에 원화를 넣고 외화를 본다
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(false);
  const toast = useToast();

  // 받은 지 12시간 안 됐으면 다시 안 받는다. 실패해도 지난 환율로 계속 쓴다.
  useEffect(() => {
    if (cached && Date.now() - Date.parse(cached.updatedAt) < 12 * 3600e3) return;
    fetchRates().then(setCached, () => setError(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 빅맥 표는 반년에 한 번 바뀐다 — 사흘에 한 번만 원본을 확인. 실패하면 들고 있는 판을 쓴다.
  useEffect(() => {
    if (mactab && Date.now() - mactab.at < 3 * 86400e3) return;
    fetchBigmac().then((t) => setMactab({ ...t, at: Date.now() }), () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mt = mactab ?? BIGMAC;

  const c = findCurrency(code);
  const auto = cached?.krwPer[code];
  const rate = manual[code] ?? auto; // 1 단위 = 몇 원
  const amount = +calc.cur;
  const other = rate ? (krwFirst ? amount / rate : amount * rate) : 0;
  const shown = roundFor(other, !krwFirst || c.per === 100); // 큰 숫자와 만 단위 표기가 같은 값을 읽게
  const top = krwFirst ? KRW : c, bottom = krwFirst ? c : KRW;
  const bigZeros = krwFirst || c.per === 100;
  const mac = rate ? bigmac(code, rate, mt) : null;
  const macs = mac ? (krwFirst ? amount : shown) / mac.krw : 0; // 지금 금액이면 빅맥 몇 개

  const key = (k: Key) => (k === "burger" ? burger() : setCalc((s) => press(s, k)));
  const pick = (next: string) => { setCode(next); setPicking(false); };
  const swap = () => { setKrwFirst((v) => !v); setCalc({ ...EMPTY, cur: String(shown) }); };
  // 🍔 만 원이 현지 돈으로 대략 얼마인지 한 번에 — 2024 버전부터 있던 버튼
  const burger = () => {
    if (!rate) return;
    setKrwFirst(false);
    setCalc({ ...EMPTY, cur: String(roughly(10000 / rate)) });
    toast(mac ? `만 원이면 ${c.name}에서 빅맥 ${(10000 / mac.krw).toFixed(1)}개예요. 즐거운 여행 되세요!` : "만 원이 대략 얼마인지 기억해 두고, 즐거운 여행 되세요!");
    petals();
  };

  return (
    <>
      <AppShellHeader>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-black tracking-tight text-zinc-900">
            <span style={{ color: ACCENT }}>{c.name} 여행용</span> 환율계산기
          </h1>
          <ShareButton url="https://calc.m1k.app" title="여행용 환율계산기" label="공유" />
        </div>
      </AppShellHeader>
      <AppShellContent>
        <div className="flex flex-col min-h-full">
          <p className="text-center text-xs text-zinc-500 py-2 border-b border-zinc-100">
            광고 없음. 사칙연산하면서 바로 환율까지.
          </p>

          <div className="flex items-center justify-center gap-2 py-3 text-sm">
            <button onClick={() => setPicking(true)} className="px-2.5 py-1 rounded-lg border font-medium" style={{ borderColor: ACCENT, color: ACCENT }}>
              {c.flag} 화폐변경
            </button>
            <div className="text-center leading-tight">
              <div className="font-semibold tabular-nums">
                {c.per} {c.code} = {rate ? (rate * c.per).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "…"} 원
              </div>
              <div className="text-[11px] text-zinc-400">
                {manual[code] ? "직접 입력한 환율" : cached ? `${new Date(cached.updatedAt).toLocaleDateString("ko-KR")} 기준` : error ? "환율을 못 받았어요" : "환율 받는 중"}
              </div>
            </div>
            <button onClick={() => (manual[code] ? setManual(({ [code]: _, ...rest }) => rest) : setEditing(true))} className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600">
              {manual[code] ? "실시간" : "직접입력"}
            </button>
          </div>

          <Row cur={top} value={formatInput(calc.cur)} sub={korean(amount)} strong />
          <button onClick={swap} aria-label="원화와 외화 위아래 바꾸기"
            className="self-center -my-4 z-10 size-8 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-500 active:scale-90 transition-transform">⇅</button>
          <Row cur={bottom} value={shown.toLocaleString()} sub={korean(shown)} />

          {mac && (
            <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 flex items-center gap-2.5">
              <span className="text-2xl">🍔</span>
              <div className="flex-1 min-w-0 leading-snug">
                <div>
                  {c.name} 빅맥 <b>{mac.krw.toLocaleString(undefined, { maximumFractionDigits: 0 })}원</b>
                  <span className="text-amber-700"> · 한국 {mt.KRW.toLocaleString()}원보다 {Math.abs(mac.diff)}% {mac.diff < 0 ? "싸요" : "비싸요"}</span>
                </div>
                <div className="text-xs text-amber-700 tabular-nums">
                  {amount > 0 ? `지금 금액이면 빅맥 ${macs < 10 ? macs.toFixed(1) : Math.floor(macs).toLocaleString()}개` : `현지 가격 ${mac.local.toLocaleString()} ${c.unit}`} · {monthLabel(mt.date)} 빅맥지수
                </div>
              </div>
            </div>
          )}

          <div className="text-right text-zinc-400 px-5 h-7 text-lg tabular-nums">
            {calc.acc !== null && calc.op ? `${formatInput(String(calc.acc))} ${calc.op}` : ""}
          </div>

          <Keypad onKey={key} zeros={bigZeros ? "000" : "00"} clearLabel={calc.acc !== null && calc.cur === "0" ? "AC" : "C"} />
        </div>
      </AppShellContent>

      <Dialog open={picking} onClose={() => setPicking(false)} title="어디로 가세요">
        <div className="grid grid-cols-3 gap-1.5">
          {CURRENCIES.map((x) => (
            <button key={x.code} onClick={() => pick(x.code)}
              className="flex flex-col items-center gap-0.5 p-2 rounded-xl border text-xs"
              style={x.code === code ? { background: ACCENT, color: "white", borderColor: ACCENT } : undefined}>
              <span className="text-2xl">{x.flag}</span>
              <span className="font-semibold">{x.name}</span>
              <span className="opacity-70">{x.code} · {x.unit}</span>
            </button>
          ))}
        </div>
      </Dialog>

      <ManualRate open={editing} cur={c} initial={rate} onClose={() => setEditing(false)}
        onSave={(v) => { setManual((m) => ({ ...m, [code]: v / c.per })); setEditing(false); }} />
    </>
  );
}

const KRW = { code: "KRW", name: "한국", unit: "원", flag: "🇰🇷", per: 1 as const };

function Row({ cur, value, sub, strong }: { cur: { code: string; flag: string }; value: string; sub: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
      <div className="flex flex-col items-center w-12 shrink-0">
        <span className="text-3xl leading-none">{cur.flag}</span>
        <span className="text-xs text-zinc-500 mt-1">{cur.code}</span>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className={`truncate tabular-nums text-[34px] font-bold leading-tight ${strong ? "text-zinc-900" : "text-zinc-400"}`}>{value}</div>
        <div className="h-4 text-xs text-zinc-500 tabular-nums">{sub}</div>
      </div>
    </div>
  );
}

function Keypad({ onKey, zeros, clearLabel }: { onKey: (k: Key) => void; zeros: string; clearLabel: string }) {
  const keys: [Key, string, "fn" | "num" | "op"][] = [
    ["C", clearLabel, "fn"], ["burger", "🍔", "fn"], ["back", "←", "fn"], ["÷", "÷", "op"],
    ["7", "7", "num"], ["8", "8", "num"], ["9", "9", "num"], ["×", "×", "op"],
    ["4", "4", "num"], ["5", "5", "num"], ["6", "6", "num"], ["-", "−", "op"],
    ["1", "1", "num"], ["2", "2", "num"], ["3", "3", "num"], ["+", "+", "op"],
    [".", ".", "num"], ["0", "0", "num"], [zeros, zeros, "num"], ["=", "=", "op"],
  ];
  return (
    <div className="grid grid-cols-4 mt-auto bg-zinc-800 select-none">
      {keys.map(([k, label, kind]) =>
        (
          <button key={k} onClick={() => onKey(k)}
            aria-label={k === "burger" ? "만 원이면 얼마" : k === "back" ? "지우기" : undefined}
            className={`h-16 text-[26px] text-white active:scale-90 transition-transform ${kind === "fn" ? "bg-black" : ""}`}
            style={kind === "op" ? { background: ACCENT } : undefined}>
            {label}
          </button>
        ),
      )}
    </div>
  );
}

function ManualRate({ open, cur, initial, onClose, onSave }: {
  open: boolean; cur: { code: string; per: number }; initial?: number; onClose: () => void; onSave: (v: number) => void;
}) {
  const [v, setV] = useState("");
  useEffect(() => { if (open) setV(initial ? String(Math.round(initial * cur.per * 100) / 100) : ""); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onClose={onClose} title="환전한 환율 넣기">
      <p className="text-sm text-zinc-500 mb-3">환전소에서 받은 환율로 계산해요. 이 기기에만 저장돼요.</p>
      <label className="flex items-center gap-2 text-sm">
        <span className="shrink-0">{cur.per} {cur.code} =</span>
        <input id="manual-rate" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
          className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-right tabular-nums" />
        <span>원</span>
      </label>
      <button disabled={!(+v > 0)} onClick={() => onSave(+v)}
        className="w-full mt-4 py-2.5 rounded-xl text-white font-semibold disabled:opacity-40" style={{ background: ACCENT }}>
        이 환율로 계산
      </button>
    </Dialog>
  );
}

// 꽃잎 터뜨리기 — 4초 뒤 스스로 치운다. 움직임 줄이기 설정이면 안 한다.
function petals() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("div");
    const size = 8 + Math.random() * 10;
    Object.assign(p.style, {
      position: "fixed", zIndex: "60", pointerEvents: "none", borderRadius: "50% 0",
      left: `${Math.random() * 100}vw`, top: "-20px", width: `${size}px`, height: `${size}px`,
      background: colors[i % colors.length],
      animation: `petal ${2 + Math.random() * 2}s ease-in ${Math.random()}s forwards`,
    });
    document.body.append(p);
    setTimeout(() => p.remove(), 4000);
  }
}
