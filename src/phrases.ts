// 빈칸(히어로)에 띄우는 현지어 한 줄 — "여행 회화 이거면 끝" 12개. 밥 먹을 때·계산할 때·시장에서 실제로 쓰는 말만(인사말 "즐거운 여행"은 현지에서 쓸 일이 없어 뺐다).
// 열 때마다 하나를 랜덤으로 보여 주고 좌우로 넘긴다.
// 음성은 scripts/greet.mjs 가 이 표로 public/greet/<통화>/<번호>.mp3 를 굽는다 — 문장을 고치면 그걸 다시 돌린다.

// 번호마다 뜻이 같다 — 화면 아랫줄에 한글 뜻으로 쓴다
export const MEAN = ["안녕하세요", "실례합니다", "고마워요", "아니요, 괜찮아요", "이거 주세요", "얼마예요?", "좀 깎아 주세요", "맛있어요!", "계산해 주세요", "화장실 어디예요?", "지나갈게요", "잘 먹었습니다"];

// [현지어, 한글 발음] — MEAN 과 같은 순서
type Line = [string, string];
const L: Record<string, Line[]> = {
  ja: [["こんにちは", "콘니치와"], ["すみません", "스미마센"], ["ありがとう", "아리가토"], ["大丈夫です", "다이죠부데스"], ["これください", "코레 쿠다사이"],
    ["いくらですか?", "이쿠라데스카"], ["安くしてください", "야스쿠 시테 쿠다사이"], ["おいしい!", "오이시이"], ["お会計お願いします", "오카이케이 오네가이시마스"], ["トイレはどこですか?", "토이레와 도코데스카"],
    ["すみません", "스미마센"], ["ごちそうさまでした", "고치소사마데시타"]],
  zh: [["你好", "니하오"], ["不好意思", "부하오이쓰"], ["谢谢", "셰셰"], ["不用了，谢谢", "부용러 셰셰"], ["我要这个", "워 야오 저거"],
    ["多少钱?", "둬샤오 첸"], ["便宜一点吧", "피엔이 이디엔 바"], ["好吃!", "하오츠"], ["买单", "마이단"], ["洗手间在哪里?", "시서우젠 짜이 나리"],
    ["借过一下", "지에궈 이샤"], ["吃饱了，谢谢", "츠바오러 셰셰"]],
  tw: [["你好", "니하오"], ["不好意思", "부하오이쓰"], ["謝謝", "셰셰"], ["不用了，謝謝", "부용러 셰셰"], ["我要這個", "워 야오 저거"],
    ["多少錢?", "둬샤오 첸"], ["便宜一點吧", "피엔이 이디엔 바"], ["好吃!", "하오츠"], ["買單", "마이단"], ["洗手間在哪裡?", "시서우젠 짜이 나리"],
    ["借過一下", "지에궈 이샤"], ["吃飽了，謝謝", "츠바오러 셰셰"]],
  // 홍콩은 보통화가 아니라 광둥어. 唔該(음꺼이) 한 마디가 실례합니다·고마워요·이거 주세요(가리키며)·지나갈게요·잘 먹었습니다(나가면서)를 다 한다 — 앞에 억지로 붙이지 않고 단독으로 쓰는 다섯만
  yue: [["你好", "네이호우"], ["唔該!", "음꺼이"], ["唔該", "음꺼이"], ["唔使喇", "음싸이 라"], ["唔該", "음꺼이"],
    ["幾多錢?", "께이도 친"], ["平啲啦", "펭 디 라"], ["好好食!", "호우호우 섹"], ["埋單", "마이단"], ["洗手間喺邊度?", "싸이싸우깐 하이 삔도우"],
    ["唔該", "음꺼이"], ["唔該", "음꺼이"]],
  vi: [["Xin chào", "신 짜오"], ["Xin lỗi", "신 로이"], ["Cảm ơn", "깜 언"], ["Không, cảm ơn", "콩 깜 언"], ["Cho tôi cái này", "쪼 또이 까이 나이"],
    ["Bao nhiêu tiền?", "바오 니에우 띠엔"], ["Bớt chút đi", "벗 쭛 디"], ["Ngon quá!", "응온 꽈"], ["Tính tiền", "띤 띠엔"], ["Nhà vệ sinh ở đâu?", "냐 베 신 어 더우"],
    ["Cho tôi qua", "쪼 또이 꽈"], ["Cảm ơn, ngon lắm", "깜 언 응온 람"]],
  // 여성 음성이라 끝말이 ค่ะ/คะ(카). 짧은 เช็คบิลค่ะ 는 Edge 가 소리를 안 줘서 ด้วย 를 붙였다
  th: [["สวัสดีค่ะ", "사왓디 카"], ["ขอโทษค่ะ", "커톳 카"], ["ขอบคุณค่ะ", "컵쿤 카"], ["ไม่เป็นไรค่ะ", "마이 펜 라이 카"], ["เอาอันนี้ค่ะ", "아오 안니 카"],
    ["เท่าไหร่คะ?", "타오라이 카"], ["ลดหน่อยได้ไหมคะ?", "롯 너이 다이 마이 카"], ["อร่อยมาก!", "아로이 막"], ["เช็คบิลด้วยค่ะ", "첵빈 두어이 카"], ["ห้องน้ำอยู่ไหนคะ?", "헝남 유 나이 카"],
    ["ขอทางหน่อยค่ะ", "커 탕 너이 카"], ["อิ่มแล้วค่ะ", "임 래우 카"]],
  fil: [["Kumusta!", "쿠무스타"], ["Excuse me po", "익스큐즈 미 포"], ["Salamat po!", "살라맛 포"], ["Hindi na po, salamat", "힌디 나 포 살라맛"], ["Pabili po nito", "파빌리 포 니토"],
    ["Magkano po?", "막카노 포"], ["Pwede pong tawad?", "푸에데 퐁 타왓"], ["Ang sarap!", "앙 사랍"], ["Bill out po", "빌 아웃 포"], ["Saan po ang CR?", "사안 포 앙 씨알"],
    ["Makikiraan po", "마키키라안 포"], ["Busog na po, salamat", "부속 나 포 살라맛"]],
  ms: [["Apa khabar?", "아파 카바르"], ["Maaf", "마아프"], ["Terima kasih", "트리마 카시"], ["Tak apa, terima kasih", "딱 아파 트리마 카시"], ["Saya nak yang ini", "사야 낙 양 이니"],
    ["Berapa harga?", "버라파 하르가"], ["Boleh kurang sikit?", "볼레 쿠랑 시킷"], ["Sedap!", "스답"], ["Boleh kira?", "볼레 키라"], ["Tandas di mana?", "탄다스 디 마나"],
    ["Tumpang lalu", "툼팡 랄루"], ["Kenyang, terima kasih", "크냥 트리마 카시"]],
  id: [["Halo!", "할로"], ["Permisi", "퍼르미시"], ["Terima kasih", "트리마 카시"], ["Tidak, terima kasih", "띠닥 트리마 카시"], ["Saya mau yang ini", "사야 마우 양 이니"],
    ["Berapa harganya?", "버라파 하르가냐"], ["Bisa kurang?", "비사 쿠랑"], ["Enak sekali!", "에낙 스칼리"], ["Minta bon", "민타 본"], ["Toiletnya di mana?", "토일렛냐 디 마나"],
    ["Permisi", "퍼르미시"], ["Kenyang, terima kasih", "크냥 트리마 카시"]],
  en: [["Hello!", "헬로"], ["Excuse me", "익스큐즈 미"], ["Thank you!", "땡큐"], ["No, thank you", "노 땡큐"], ["I'll have this one", "아일 해브 디스 원"],
    ["How much is it?", "하우 머치 이즈 잇"], ["Any discount?", "애니 디스카운트"], ["This is delicious!", "디스 이즈 딜리셔스"], ["Can I get the bill?", "캔 아이 겟 더 빌"], ["Where's the toilet?", "웨얼즈 더 토일렛"],
    ["Coming through!", "커밍 스루"], ["Thanks, that was great!", "땡스 댓 워즈 그레잇"]],
  fr: [["Bonjour!", "봉주르"], ["Excusez-moi", "엑스퀴제 무아"], ["Merci!", "메르시"], ["Non, merci", "농 메르시"], ["Je prends ça", "주 프랑 싸"],
    ["C'est combien?", "쎄 콩비앙"], ["Une petite réduction?", "윈 프티트 레뒥시옹"], ["C'est délicieux!", "쎄 델리시외"], ["L'addition, s'il vous plaît", "라디시옹 실부플레"], ["Où sont les toilettes?", "우 쏭 레 투알레트"],
    ["Pardon, je passe", "파르동 주 파스"], ["C'était très bon, merci", "쎄테 트레 봉 메르시"]],
  de: [["Grüezi!", "그뤼에치"], ["Entschuldigung", "엔트슐디궁"], ["Danke!", "당케"], ["Nein, danke", "나인 당케"], ["Das hier, bitte", "다스 히어 비테"],
    ["Wie viel kostet das?", "비 필 코스텟 다스"], ["Geht's etwas günstiger?", "게츠 에트바스 귄스티거"], ["Sehr lecker!", "제어 레커"], ["Zahlen, bitte", "찰렌 비테"], ["Wo ist die Toilette?", "보 이스트 디 토알레테"],
    ["Darf ich mal?", "다르프 이히 말"], ["Danke, war lecker!", "당케 바어 레커"]],
  hi: [["नमस्ते", "나마스테"], ["सुनिए", "수니에"], ["धन्यवाद", "단야와드"], ["नहीं, धन्यवाद", "나힌 단야와드"], ["यह दीजिए", "예 디지에"],
    ["कितने का है?", "끼뜨네 까 해"], ["थोड़ा कम कीजिए", "토라 깜 끼지에"], ["बहुत स्वादिष्ट!", "바후뜨 스와디슈트"], ["बिल दीजिए", "빌 디지에"], ["टॉयलेट कहाँ है?", "토일렛 까한 해"],
    ["रास्ता दीजिए", "라스타 디지에"], ["खाना बढ़िया था", "카나 바디야 타"]],
  es: [["¡Hola!", "올라"], ["Disculpe", "디스쿨페"], ["¡Gracias!", "그라시아스"], ["No, gracias", "노 그라시아스"], ["Quiero este", "키에로 에스테"],
    ["¿Cuánto cuesta?", "쿠안토 쿠에스타"], ["¿Me hace un descuento?", "메 아세 운 데스쿠엔토"], ["¡Qué rico!", "케 리코"], ["La cuenta, por favor", "라 쿠엔타 포르 파보르"], ["¿Dónde está el baño?", "돈데 에스타 엘 바뇨"],
    ["Con permiso", "콘 페르미소"], ["Todo muy rico, gracias", "토도 무이 리코 그라시아스"]],
};

// 통화 → [문장표, 내장 음성 언어(mp3 못 받을 때), Edge 신경망 음성]. 영어권은 같은 문장을 그 나라 억양으로
export const VOICE: Record<string, [string, string, string]> = {
  JPY: ["ja", "ja-JP", "ja-JP-NanamiNeural"], CNY: ["zh", "zh-CN", "zh-CN-XiaoxiaoNeural"], VND: ["vi", "vi-VN", "vi-VN-HoaiMyNeural"],
  THB: ["th", "th-TH", "th-TH-PremwadeeNeural"], PHP: ["fil", "fil-PH", "fil-PH-BlessicaNeural"], TWD: ["tw", "zh-TW", "zh-TW-HsiaoChenNeural"],
  USD: ["en", "en-US", "en-US-AvaNeural"], HKD: ["yue", "zh-HK", "zh-HK-HiuMaanNeural"], SGD: ["en", "en-SG", "en-SG-LunaNeural"],
  MYR: ["ms", "ms-MY", "ms-MY-YasminNeural"], IDR: ["id", "id-ID", "id-ID-GadisNeural"], AUD: ["en", "en-AU", "en-AU-NatashaNeural"],
  CAD: ["en", "en-CA", "en-CA-ClaraNeural"], EUR: ["fr", "fr-FR", "fr-FR-DeniseNeural"], GBP: ["en", "en-GB", "en-GB-SoniaNeural"],
  CHF: ["de", "de-CH", "de-CH-LeniNeural"], INR: ["hi", "hi-IN", "hi-IN-SwaraNeural"], MXN: ["es", "es-MX", "es-MX-DaliaNeural"],
};

export const phrases = (code: string) => L[VOICE[code][0]];
