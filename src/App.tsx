import { useEffect, useState } from "react";
import { AppShell, AppShellContent, AppShellHeader, InAppSheet, PWAInstallButton, ShareButton, useLocalStorage, Watermark, watermarkTint } from "@m1kapp/kit";
import { BIGMAC, bigmac, IPHONE, iphone, rankBy, CURRENCIES, EMPTY, fetchBigmac, fetchPpp, fetchRates, monthLabel, PPP, priceLevel, type BigMac, type Ppp, findCode, findCurrency, formatInput, korean, press, tapeText, roundFor, type Calc, type Key, type Rates } from "./fx";
import { MEAN, phrases, VOICE } from "./phrases";

const ACCENT = "#3b82f6";
// m1k.app 계정에 등록된 slug (Vite라 env 대신 prop). Watermark 가 배지 로드로 집계까지 한다 — 배지를 따로 달면 두 번 센다
const TRACK_SLUG = "gN";

export default function App() {
  return (
    <Watermark color={watermarkTint(ACCENT)} text="calc" trackSlug={TRACK_SLUG} claimed>
      {/* 액자 배경은 투명, 흰색은 안쪽 칸이 칠한다 — 액자 흰 배경이 둥근 모서리 아래로 비쳐 어두운 키패드 모서리에 흰 테가 생겼다 */}
      <AppShell accent={ACCENT} style={{ background: "transparent" }}>
        <Calculator />
      </AppShell>
    </Watermark>
  );
}

function Calculator() {
  const [saved, setCode] = useLocalStorage("calc:currency", "JPY");
  // 나라별 주소: /vnd · 예전 calcreator 의 /currency/vnd 도 받는다. 주소가 저장값보다 우선.
  const [fromUrl, setFromUrl] = useState(() => findCode(location.pathname.split("/").pop() ?? ""));
  const code = fromUrl ?? saved;
  // 링크로 들어온 나라도 마지막 선택으로 기록한다 — 홈 화면 앱은 늘 / 로 열려서 저장값을 본다
  useEffect(() => { if (fromUrl) setCode(fromUrl); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [manual, setManual] = useLocalStorage<Record<string, number>>("calc:manual", {});
  const [cached, setCached] = useLocalStorage<Rates | null>("calc:rates", null);
  const [mactab, setMactab] = useLocalStorage<(BigMac & { at: number }) | null>("calc:bigmac", null);
  const [ppptab, setPpptab] = useLocalStorage<(Ppp & { at: number }) | null>("calc:ppp", null);
  const [calc, setCalc] = useState<Calc>(EMPTY);
  const [fill, setFill] = useState<{ n: number; dur: number } | null>(null); // 현지어 읽는 중 색 채우기
  const [line, setLine] = useState(() => Math.floor(Math.random() * MEAN.length)); // 히어로 문장 번호 — 열 때마다 랜덤, 좌우로 넘긴다
  const [krwFirst, setKrwFirst] = useState(false); // 위 칸에 원화를 넣고 외화를 본다
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(false);
  const [prices, setPrices] = useState(false);
  const [ranking, setRanking] = useState<"mac" | "phone" | "level" | null>(null); // 물가 시트에서 "전체 순위"
  const [hist, setHist] = useLocalStorage<Hist[]>("calc:history", []); // history 는 window.history 와 겹친다
  const [viewing, setViewing] = useState(false);

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
  // 물가표는 1년에 한 번 바뀐다 — 같은 방식으로 일주일에 한 번만 확인
  useEffect(() => {
    if (ppptab && Date.now() - ppptab.at < 7 * 86400e3) return;
    fetchPpp().then((t) => setPpptab({ ...t, at: Date.now() }), () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mt = mactab ?? BIGMAC;
  const pt = ppptab ?? PPP;

  const c = findCurrency(code);
  const list = phrases(code), at = line % list.length; // 나라마다 문장 수가 달라 바꿀 때 넘치지 않게
  const [text, pron] = list[at], mean = MEAN[at];
  const listen = (i: number) => { setLine(i); say(code, i, (dur) => setFill({ n: Date.now(), dur })); };
  useEffect(() => {
    history.replaceState(null, "", `/${code.toLowerCase()}`);
    document.title = `${c.name} 여행용 환율계산기`;
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  const auto = cached?.krwPer[code];
  const rate = manual[code] ?? auto; // 1 단위 = 몇 원
  const amount = +calc.cur;
  const other = rate ? (krwFirst ? amount / rate : amount * rate) : 0;
  const shown = roundFor(other, !krwFirst || c.per === 100); // 큰 숫자와 만 단위 표기가 같은 값을 읽게
  const top = krwFirst ? KRW : c, bottom = krwFirst ? c : KRW;
  const bigZeros = krwFirst || c.per === 100;
  const mac = rate ? bigmac(code, rate, mt) : null;
  const phone = rate ? iphone(code, rate, IPHONE) : null;
  const level = rate ? priceLevel(code, rate, pt) : null;

  // 최근 계산: = 를 누를 때, 또는 보던 숫자를 C 로 지울 때 남긴다 — 여행 중엔 금액만 치고 = 는 잘 안 누른다
  const record = (s: Calc) => {
    const n = +s.cur;
    if (!n || !rate) return;
    const other = roundFor(krwFirst ? n / rate : n * rate, !krwFirst || c.per === 100);
    const [tu, bu] = krwFirst ? ["원", c.unit] : [c.unit, "원"];
    const t = tapeText(s.tape);
    const entry: Hist = { code, krwFirst, n, top: `${t ? t + " " : ""}${formatInput(s.cur)}${tu}`, bottom: bu === "원" ? won(other) : `${other.toLocaleString()}${bu}`, at: Date.now() };
    setHist((h) => (h[0]?.top === entry.top && h[0]?.code === code ? h : [entry, ...h].slice(0, 30)));
  };
  const key = (k: Key) => {
    if (k === "burger") return setPrices(true);
    const next = press(calc, k);
    if (k === "=" && next !== calc) record(next);
    if (k === "C" && calc.tape[calc.tape.length - 1] !== "=") record(calc);
    setCalc(next);
  };
  const restore = (h: Hist) => { pick(h.code); setKrwFirst(h.krwFirst); setCalc({ ...EMPTY, cur: String(h.n), fresh: true }); setViewing(false); };
  const pick = (next: string) => { setCode(next); setFromUrl(null); setPicking(false); };
  const swap = () => { setKrwFirst((v) => !v); setCalc({ ...EMPTY, cur: String(shown) }); };

  return (
    <>
      {/* 이 앱은 밝은 화면만 — 배경만 흰색으로 고정하면 다크 모드에서 테두리만 kit 의 dark:border-zinc-800 이 돼 검은 줄이 생긴다 */}
      <AppShellHeader className="bg-white! border-zinc-100!">
        <div className="flex items-center justify-between w-full gap-2">
          <h1 className="min-w-0 truncate text-lg max-[359px]:text-base font-black tracking-tight text-zinc-900">
            <span style={{ color: ACCENT }}>{c.name} 여행용</span> 환율계산기
          </h1>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* 설치할 수 있을 때만 보인다(설치됨·지원 안 함이면 사라짐). 인스타·카톡 안이면 바깥 브라우저로 여는 법 안내 */}
            <PWAInstallButton variant="ghost" label="설치" appName="여행용 환율계산기" iconSrc="/icon-192.png" />
            <button onClick={() => setViewing(true)} aria-label="최근 계산"
              className="flex items-center justify-center size-8 rounded-full text-zinc-500 hover:bg-zinc-100 active:bg-zinc-100 active:scale-95 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>
            </button>
            <ShareButton url={`https://calc.m1k.app/${code.toLowerCase()}`} title={`${c.name} 여행용 환율계산기`} label="공유" variant="ghost" />
          </div>
        </div>
      </AppShellHeader>
      <AppShellContent>
        <div className="flex flex-col min-h-full bg-white">
          {/* 남는 높이는 숫자 위로 — 폰 계산기처럼 숫자는 키패드 바로 위에 붙는다.
              빈칸은 히어로(현지어 여행 인사)가 채운다: 칸 높이(cqh)에 맞춰 글자가 커지고 작아지며, 낮으면 인사 한 줄만, 더 낮으면 숨는다(index.css .hero) */}
          <div className="hero relative flex-[1_1_56px] short:flex-[1_1_0px]! min-h-0 flex flex-col items-center justify-center overflow-hidden select-none px-4 text-center">
            {/* 좌우 화살표로 다른 문장 — 넘기면 바로 읽어 준다 */}
            {([-1, 1] as const).map((d) => (
              <button key={d} onClick={() => listen((at + d + list.length) % list.length)} aria-label={d < 0 ? "이전 문장" : "다음 문장"}
                className={`hero-in absolute top-1/2 -translate-y-1/2 ${d < 0 ? "left-1" : "right-1"} flex items-center justify-center size-10 text-zinc-300 active:scale-90 transition-transform`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={d < 0 ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} /></svg>
              </button>
            ))}
            {/* 누르면 현지 발음으로 읽어 준다(public/greet/<통화>/<번호>.mp3) */}
            <button onClick={() => listen(at)} aria-label={`${text} 현지 발음 듣기`} className="hero-in active:scale-95 transition-transform">
              {/* 읽는 동안 왼쪽부터 색이 차오른다 — 옅은 글자 위에 진한 글자를 겹치고 잘린 폭을 늘린다 */}
              <div className="relative font-black leading-tight whitespace-nowrap" style={{ fontSize: fit(text, 30, 16, 44) }}>
                <span style={{ color: ACCENT, opacity: 0.32 }}>{text}</span>
                {fill && <span key={fill.n} className="absolute inset-0 hero-fill" style={{ color: ACCENT, animationDuration: `${fill.dur}s` }} onAnimationEnd={() => setFill(null)}>{text}</span>}
              </div>
              <div className="hero-sub mt-[2cqh] whitespace-nowrap text-zinc-400" style={{ fontSize: fit(`${pron} · ${mean} 🔊`, 12, 11, 15) }}>{pron} · {mean} <span className="emoji">🔊</span></div>
            </button>
          </div>
          {/* 지금 쓰는 환율 한 줄 — 눌러서 환전소 환율로 덮거나 실시간으로 되돌린다 */}
          <div className="flex items-center gap-2 px-4 pt-2 text-xs text-zinc-400 tabular-nums">
            {/* 국기·코드는 바로 아래 줄에 있으니 여기선 "변경"만 — 양쪽 버튼을 같은 크기로 두고 환율은 가운데 */}
            <button onClick={() => setPicking(true)} aria-label="화폐 변경" className={RATE_BTN}>
              <span className="emoji text-sm leading-none">🌏</span>변경
            </button>
            <span className="flex-1 min-w-0 truncate text-center">
              <span className="font-semibold text-zinc-600">{c.per} {c.code} = {rate ? (rate * c.per).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "…"}원</span>
              {/* 아주 좁은 화면(SE)은 날짜를 빼고 환율만 */}
              <span className={manual[code] || error || !cached ? "" : "max-[359px]:hidden"}>
                {" · "}{manual[code] ? "직접 입력" : cached ? `${error ? "오프라인 · " : ""}${shortDate(cached.updatedAt)} 기준` : error ? "환율을 못 받았어요" : "받는 중"}
              </span>
            </span>
            <button onClick={() => (manual[code] ? setManual(({ [code]: _, ...rest }) => rest) : setEditing(true))} className={RATE_BTN}>
              {manual[code] ? "실시간" : "직접입력"}
            </button>
          </div>
          <Row cur={top} value={formatInput(calc.cur)} sub={korean(amount)} strong
            expr={tapeText(calc.tape)} onFlag={() => setPicking(true)} />
          <button onClick={swap} aria-label="원화와 외화 위아래 바꾸기"
            className="self-center -my-4 z-10 size-8 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-500 active:scale-90 transition-transform">⇅</button>
          <Row cur={bottom} value={shown.toLocaleString()} sub={korean(shown)} onFlag={() => setPicking(true)} />


          <Keypad onKey={key} zeros={bigZeros ? "000" : "00"} clearLabel={calc.acc !== null && calc.cur === "0" ? "AC" : "C"} />
        </div>
      </AppShellContent>

      <InAppSheet open={picking} onClose={() => setPicking(false)} title="어디로 가세요">
        <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((x) => (
            <button key={x.code} onClick={() => pick(x.code)}
              className="flex flex-col items-center gap-0.5 py-3 rounded-2xl bg-zinc-100/70 text-xs text-zinc-800 active:scale-95 transition-transform"
              style={x.code === code ? { background: ACCENT, color: "white" } : undefined}>
              <span className="emoji text-2xl">{x.flag}</span>
              <span className="font-semibold">{x.name}</span>
              <span className="opacity-60">{x.code} · {x.unit}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-400">
          한국인이 많이 가는 순 · 2026년 9월 법무부 출국 통계 참고
          <br />
          (대만부터는 2025년 방문객 규모로 대략)
        </p>
        </div>
      </InAppSheet>

      <InAppSheet open={prices} onClose={() => setPrices(false)} title={`한국 vs ${c.name} 물가`}>
        <div className="px-5 pb-4">
          {!rate ? <p className="text-sm text-zinc-500">환율을 받은 뒤에 볼 수 있어요.</p> : (
            <>
              <div className="grid grid-cols-[4.5rem_1fr_1fr] items-start gap-x-2 text-center">
                <span />
                <Side flag="🇰🇷" name="한국" />
                <Side flag={c.flag} name={c.name} accent />

                {mac && <>
                  <Line label="빅맥 한 개" left={`${mt.KRW.toLocaleString()}원`}
                    right={`${mac.krw.toLocaleString(undefined, { maximumFractionDigits: 0 })}원`}
                    sub={`${mac.local.toLocaleString()}${c.unit}`} diff={mac.diff} onMore={() => setRanking("mac")} />
                </>}
                {phone && <Line label={IPHONE.model} left={won(IPHONE.KRW)} right={won(Math.round(phone.krw / 1e4) * 1e4)}
                  sub={`${phone.local.toLocaleString()}${c.unit}`} diff={phone.diff} onMore={() => setRanking("phone")} />}
                {level && <Line label="전체 물가" left="100" right={String(level)} diff={level - 100} bars={[100, level]} onMore={() => setRanking("level")} />}
              </div>
              {!mac && !phone && !level && <p className="mt-3 text-sm text-zinc-500">이 나라는 아직 물가 자료가 없어요.</p>}
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
                {mac && <>빅맥 · 이코노미스트 빅맥지수 {monthLabel(mt.date)}<br /></>}
                {phone && <>아이폰 · 애플 공식 스토어 가장 싼 용량 {monthLabel(IPHONE.date)}{code === "USD" || code === "CAD" ? " · 세금 별도 가격" : ""}<br /></>}
                {level && <>전체 물가 · 세계은행 가계소비 물가 {pt.year}년 · 오늘 환율로 계산한 대략값</>}
              </p>
            </>
          )}
        </div>
      </InAppSheet>

      {/* 물가 한 줄의 전체 순위 — 오늘 환율로 원화(물가는 지수)로 맞춰 싼 나라부터. 누르면 그 나라로 */}
      <InAppSheet open={!!ranking} onClose={() => setRanking(null)}
        title={ranking === "mac" ? "빅맥 한 개 · 싼 나라 순" : ranking === "phone" ? `${IPHONE.model} · 싼 나라 순` : "전체 물가 · 싼 나라 순"}>
        <ol className="px-5 pb-4">
          {ranking && cached && rankBy((k) => {
            const r = cached.krwPer[k];
            if (ranking === "mac") return bigmac(k, r, mt)?.krw ?? null;
            if (ranking === "phone") return iphone(k, r, IPHONE)?.krw ?? null;
            return priceLevel(k, r, pt);
          }, ranking === "mac" ? mt.KRW : ranking === "phone" ? IPHONE.KRW : 100).map((row, i) => {
            const cur = row.code === "KRW" ? KRW : findCurrency(row.code);
            const base = ranking === "mac" ? mt.KRW : ranking === "phone" ? IPHONE.KRW : 100;
            const diff = Math.round((row.v / base - 1) * 100);
            return (
              <li key={row.code}>
                <button disabled={row.code === "KRW"} onClick={() => { pick(row.code); setRanking(null); setPrices(false); }}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left tabular-nums enabled:active:bg-zinc-100 ${row.code === code ? "bg-blue-50" : row.code === "KRW" ? "bg-zinc-50" : ""}`}>
                  <span className="w-5 text-right text-xs font-semibold text-zinc-400">{i + 1}</span>
                  <span className="emoji text-xl leading-none">{cur.flag}</span>
                  <span className={`flex-1 text-[15px] ${row.code === code ? "font-bold" : "font-medium"} text-zinc-800`}>{cur.name}</span>
                  <span className="text-[15px] font-semibold text-zinc-900">{ranking === "level" ? row.v : ranking === "phone" ? won(Math.round(row.v / 1e4) * 1e4) : won(row.v)}</span>
                  <span className={`w-14 text-right text-[11px] font-semibold ${row.code === "KRW" || diff === 0 ? "text-zinc-400" : diff < 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {row.code === "KRW" ? "기준" : diff === 0 ? "같음" : `${Math.abs(diff)}% ${diff < 0 ? "↓" : "↑"}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {ranking === "phone" && <p className="px-5 pb-4 -mt-2 text-[11px] text-zinc-400">애플 공식 스토어 가장 싼 용량 · 미국·캐나다는 세금 별도 · 오늘 환율</p>}
      </InAppSheet>

      <InAppSheet open={viewing} onClose={() => setViewing(false)} title="최근 계산">
        <div className="px-5 pb-4">
          {hist.length === 0 && (
            <p className="py-6 text-center text-sm leading-relaxed text-zinc-400">아직 기록이 없어요<br />= 를 누르거나, 금액을 보고 C 로 지우면 남아요</p>
          )}
          <ul className="divide-y divide-zinc-100">
            {hist.map((h) => (
              <li key={h.at} className="flex items-center">
                <button onClick={() => restore(h)} className="min-w-0 flex-1 flex items-center gap-3 py-3 text-left active:bg-zinc-50">
                  <span className="emoji text-2xl leading-none">{findCurrency(h.code).flag}</span>
                  <span className="min-w-0 flex-1 tabular-nums">
                    <span className="block truncate text-[15px] font-semibold text-zinc-900">{h.top}</span>
                    <span className="block truncate text-xs text-zinc-500">= {h.bottom}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-400">{ago(h.at)}</span>
                </button>
                <button onClick={() => setHist((all) => all.filter((x) => x.at !== h.at))} aria-label="이 기록 지우기"
                  className="shrink-0 -mr-2 ml-1 p-2 rounded-full text-zinc-300 hover:text-zinc-500 active:bg-zinc-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </li>
            ))}
          </ul>
          {hist.length > 0 && <button onClick={() => { setHist([]); setViewing(false); }} className="mt-2 w-full py-2.5 text-sm text-zinc-400">모두 지우기</button>}
        </div>
      </InAppSheet>

      <ManualRate open={editing} cur={c} initial={rate} onClose={() => setEditing(false)}
        onSave={(v) => { setManual((m) => ({ ...m, [code]: v / c.per })); setEditing(false); }} />
    </>
  );
}

const won = (n: number) => `${korean(n) || Math.round(n).toLocaleString()}원`;

// 히어로 글자 크기 — 칸 높이(cqh)로 키우되, 폭(cqw)에 한 줄로 들어가는 만큼만. 두 줄로 접히면 무너져 보인다. 양옆 화살표 자리를 빼고 76%
// 폭은 글자 수로 어림: 한중일·한글은 1em, 나머지는 0.6em
const fit = (text: string, hPct: number, min: number, max: number) => {
  const em = [...text].reduce((w, ch) => w + (/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.6), 0);
  return `clamp(${min}px, min(${hPct}cqh, ${(76 / em).toFixed(2)}cqw), ${max}px)`;
};

// 현지어 음성 — 브라우저 내장 음성은 기기마다 로봇 같거나 영어가 어색해서, 나라별 원어민 음성(Microsoft Edge 신경망)을 미리 구워 둔 mp3(scripts/greet.mjs).
// 못 받으면(오프라인 첫 실행 등) 내장 음성으로
let playing: HTMLAudioElement | null = null;
// onStart(초): 소리가 실제로 나기 시작할 때 길이를 알려 준다 — 색 채우기를 소리에 맞춘다
const say = (code: string, i: number, onStart: (dur: number) => void) => {
  playing?.pause(); // 연타하면 겹치지 않고 처음부터
  const a = (playing = new Audio(`/greet/${code.toLowerCase()}/${i}.mp3`));
  a.onplaying = () => onStart(Number.isFinite(a.duration) ? a.duration : 1.8);
  a.play().catch(() => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(phrases(code)[i][0]);
    u.lang = VOICE[code][1];
    u.onstart = () => onStart(1.8);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
};

// 최근 계산 한 줄 — 누르면 그 나라·그 금액으로 돌아간다. 이 기기에만 남는다
type Hist = { code: string; krwFirst: boolean; n: number; top: string; bottom: string; at: number };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60e3); return m < 1 ? "방금" : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };


const RATE_BTN = "shrink-0 flex items-center justify-center gap-1 min-w-[4.25rem] h-7 px-2 rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 active:scale-95 transition-transform";

// "2026-10-25T…" → "'26.10.25"
const shortDate = (iso: string) => { const d = new Date(iso); return `'${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };

const KRW = { code: "KRW", name: "한국", unit: "원", flag: "🇰🇷", per: 1 as const };

// expr: 계산 중인 식(1,000 +) — 폰 계산기처럼 큰 숫자 바로 위에. 키패드 위에 따로 띄우면 좁은 띠가 생겼다
function Row({ cur, value, sub, strong, expr, onFlag }: { cur: { code: string; flag: string }; value: string; sub: string; strong?: boolean; expr?: string; onFlag?: () => void }) {
  // 외화 국기를 누르면 나라 바꾸기(원화 국기는 바꿀 게 없다)
  const pickable = onFlag && cur.code !== "KRW";
  return (
    <div className="flex items-center gap-3 px-4 py-3 short:py-1.5! border-b border-zinc-100">
      <button onClick={pickable ? onFlag : undefined} disabled={!pickable} aria-label={pickable ? "화폐 변경" : undefined}
        className="flex flex-col items-center w-12 shrink-0 enabled:active:scale-95 transition-transform">
        <span className="emoji text-3xl leading-none">{cur.flag}</span>
        <span className="text-xs text-zinc-500 mt-1">{cur.code}</span>
      </button>
      <div className="flex-1 min-w-0 text-right">
        {/* 길어지면 앞쪽이 잘리고 최근 식이 보인다 */}
        {expr !== undefined && <div className="h-5 flex justify-end overflow-hidden whitespace-nowrap text-sm text-zinc-400 tabular-nums">{expr}</div>}
        <div className={`truncate tabular-nums text-[clamp(30px,calc(6.5dvh-8px),52px)] font-bold leading-tight ${strong ? "text-zinc-900" : "text-zinc-400"}`}>{value}</div>
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
  // 키패드가 높이를 먼저 가져간다(3:1) — 키 한 줄 48~88px. 낮은 화면에선 키가 줄고, 높은 화면에선 커지다 멈춘다
  return (
    <div className="grid grid-cols-4 grid-rows-5 flex-[3_1_240px] min-h-60 max-h-[440px] bg-zinc-800 select-none">
      {keys.map(([k, label, kind]) =>
        (
          <button key={k} onClick={() => onKey(k)}
            aria-label={k === "burger" ? "이 나라 물가 보기" : k === "back" ? "지우기" : undefined}
            className={`text-[26px] text-white active:scale-90 transition-transform ${kind === "fn" ? "bg-black" : ""}`}
            style={kind === "op" ? { background: ACCENT } : undefined}>
            {k === "burger" ? <span className="emoji">{label}</span> : label}
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
    <InAppSheet open={open} onClose={onClose} title="환전한 환율 넣기">
      <div className="px-5 pb-5">
        <p className="text-sm text-zinc-500 mb-4">환전소에서 받은 환율로 계산해요. 이 기기에만 저장돼요.</p>
        <label className="flex items-center gap-2 rounded-2xl bg-zinc-100/70 px-4 py-3 text-sm text-zinc-600">
          <span className="shrink-0 font-semibold">{cur.per} {cur.code} =</span>
          <input id="manual-rate" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-right text-xl font-bold text-zinc-900 tabular-nums outline-none" />
          <span>원</span>
        </label>
        <button disabled={!(+v > 0)} onClick={() => onSave(+v)}
          className="w-full mt-3 py-3 rounded-2xl text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform" style={{ background: ACCENT }}>
          이 환율로 계산
        </button>
      </div>
    </InAppSheet>
  );
}


function Side({ flag, name, accent }: { flag: string; name: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center pb-2">
      <span className="emoji text-3xl leading-none">{flag}</span>
      <span className="mt-1 text-sm font-bold" style={accent ? { color: ACCENT } : undefined}>{name}</span>
    </div>
  );
}

// 한 줄 = 라벨 | 한국 | 그 나라. diff 는 한국 대비 % (음수면 싸다)
function Line({ label, left, right, sub, diff, bars, onMore }: {
  label: string; left: string; right: string; sub?: string; diff?: number; bars?: [number, number]; onMore?: () => void;
}) {
  const max = bars ? Math.max(...bars) : 0;
  const bar = (v: number, accent?: boolean) => bars && (
    <div className="mt-1.5 mx-auto h-1.5 w-4/5 rounded-full bg-zinc-200 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: accent ? ACCENT : "#a1a1aa" }} />
    </div>
  );
  return (
    <>
      <span className="col-span-3 border-t border-zinc-100" />
      <span className="pt-[17px] pb-3 text-left text-xs font-semibold text-zinc-500">
        {label}
        {onMore && <button onClick={onMore} className="mt-1.5 block text-[11px] font-semibold" style={{ color: ACCENT }}>전체 순위 ›</button>}
      </span>
      <div className="py-3 tabular-nums">
        <div className="text-[17px] font-semibold text-zinc-700">{left}</div>
        {bars && bar(bars[0])}
      </div>
      <div className="py-3 tabular-nums">
        <div className="text-[17px] font-bold text-zinc-900">{right}</div>
        {sub && <div className="text-[11px] text-zinc-400">{sub}</div>}
        {bars && bar(bars[1], true)}
        {diff !== undefined && diff !== 0 && (
          <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${diff < 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {Math.abs(diff)}% {diff < 0 ? "싸요" : "비싸요"}
          </div>
        )}
      </div>
    </>
  );
}
