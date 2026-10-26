// 빈칸(히어로)에 띄우는 현지어 한 줄 — 밥 먹을 때·계산할 때·시장에서 자주 쓰는 말. 열 때마다 하나를 랜덤으로 보여 준다.
// 음성은 scripts/greet.mjs 가 이 표로 public/greet/<통화>/<번호>.mp3 를 굽는다 — 문장을 고치면 그걸 다시 돌린다.

// 번호마다 뜻이 같다 — 화면 아랫줄에 한글 뜻으로 쓴다
export const MEAN = ["즐거운 여행", "안녕하세요", "고마워요", "얼마예요?", "이거 주세요", "계산해 주세요", "맛있어요!", "좀 깎아 주세요", "화장실 어디예요?"];

// [현지어, 한글 발음] — MEAN 과 같은 순서
type Line = [string, string];
const L: Record<string, Line[]> = {
  ja: [["楽しい旅を!", "타노시이 타비오"], ["こんにちは", "콘니치와"], ["ありがとう", "아리가토"], ["いくらですか?", "이쿠라데스카"], ["これください", "코레 쿠다사이"],
    ["お会計お願いします", "오카이케이 오네가이시마스"], ["おいしい!", "오이시이"], ["安くしてください", "야스쿠 시테 쿠다사이"], ["トイレはどこですか?", "토이레와 도코데스카"]],
  zh: [["旅途愉快!", "뤼투 위콰이"], ["你好", "니하오"], ["谢谢", "셰셰"], ["多少钱?", "둬샤오 첸"], ["我要这个", "워 야오 저거"],
    ["买单", "마이단"], ["好吃!", "하오츠"], ["便宜一点吧", "피엔이 이디엔 바"], ["洗手间在哪里?", "시서우젠 짜이 나리"]],
  tw: [["旅途愉快!", "뤼투 위콰이"], ["你好", "니하오"], ["謝謝", "셰셰"], ["多少錢?", "둬샤오 첸"], ["我要這個", "워 야오 저거"],
    ["買單", "마이단"], ["好吃!", "하오츠"], ["便宜一點吧", "피엔이 이디엔 바"], ["洗手間在哪裡?", "시서우젠 짜이 나리"]],
  // 홍콩은 보통화가 아니라 광둥어
  yue: [["玩得開心!", "완딱 호이쌈"], ["你好", "네이호우"], ["唔該", "음꺼이"], ["幾多錢?", "께이도 친"], ["我要呢個", "응오 이우 니꼬"],
    ["埋單", "마이단"], ["好好食!", "호우호우 섹"], ["平啲啦", "펭 디 라"], ["洗手間喺邊度?", "싸이싸우깐 하이 삔도우"]],
  vi: [["Chúc chuyến đi vui vẻ!", "쭉 쭈옌 디 부이 베"], ["Xin chào", "신 짜오"], ["Cảm ơn", "깜 언"], ["Bao nhiêu tiền?", "바오 니에우 띠엔"], ["Cho tôi cái này", "쪼 또이 까이 나이"],
    ["Tính tiền", "띤 띠엔"], ["Ngon quá!", "응온 꽈"], ["Bớt chút đi", "벗 쭛 디"], ["Nhà vệ sinh ở đâu?", "냐 베 신 어 더우"]],
  // 여성 음성이라 끝말이 ค่ะ/คะ(카). 짧은 เช็คบิลค่ะ 는 Edge 가 소리를 안 줘서 ด้วย 를 붙였다
  th: [["เที่ยวให้สนุกนะ!", "티아우 하이 사눅 나"], ["สวัสดีค่ะ", "사왓디 카"], ["ขอบคุณค่ะ", "컵쿤 카"], ["เท่าไหร่คะ?", "타오라이 카"], ["เอาอันนี้ค่ะ", "아오 안니 카"],
    ["เช็คบิลด้วยค่ะ", "첵빈 두어이 카"], ["อร่อยมาก!", "아로이 막"], ["ลดหน่อยได้ไหมคะ?", "롯 너이 다이 마이 카"], ["ห้องน้ำอยู่ไหนคะ?", "헝남 유 나이 카"]],
  fil: [["Ingat sa biyahe!", "잉앗 사 비야헤"], ["Kumusta!", "쿠무스타"], ["Salamat po!", "살라맛 포"], ["Magkano po?", "막카노 포"], ["Pabili po nito", "파빌리 포 니토"],
    ["Bill out po", "빌 아웃 포"], ["Ang sarap!", "앙 사랍"], ["Pwede pong tawad?", "푸에데 퐁 타왓"], ["Saan po ang CR?", "사안 포 앙 씨알"]],
  ms: [["Selamat bercuti!", "슬라맛 버르추티"], ["Apa khabar?", "아파 카바르"], ["Terima kasih", "트리마 카시"], ["Berapa harga?", "버라파 하르가"], ["Saya nak yang ini", "사야 낙 양 이니"],
    ["Boleh kira?", "볼레 키라"], ["Sedap!", "스답"], ["Boleh kurang sikit?", "볼레 쿠랑 시킷"], ["Tandas di mana?", "탄다스 디 마나"]],
  id: [["Selamat berlibur!", "슬라맛 버를리부르"], ["Halo!", "할로"], ["Terima kasih", "트리마 카시"], ["Berapa harganya?", "버라파 하르가냐"], ["Saya mau yang ini", "사야 마우 양 이니"],
    ["Minta bon", "민타 본"], ["Enak sekali!", "에낙 스칼리"], ["Bisa kurang?", "비사 쿠랑"], ["Toiletnya di mana?", "토일렛냐 디 마나"]],
  en: [["Have a great trip!", "해브 어 그레잇 트립"], ["Hello!", "헬로"], ["Thank you!", "땡큐"], ["How much is it?", "하우 머치 이즈 잇"], ["I'll have this one", "아일 해브 디스 원"],
    ["Can I get the bill?", "캔 아이 겟 더 빌"], ["This is delicious!", "디스 이즈 딜리셔스"], ["Any discount?", "애니 디스카운트"], ["Where's the toilet?", "웨얼즈 더 토일렛"]],
  fr: [["Bon voyage!", "봉 부아야주"], ["Bonjour!", "봉주르"], ["Merci!", "메르시"], ["C'est combien?", "쎄 콩비앙"], ["Je prends ça", "주 프랑 싸"],
    ["L'addition, s'il vous plaît", "라디시옹 실부플레"], ["C'est délicieux!", "쎄 델리시외"], ["Une petite réduction?", "윈 프티트 레뒥시옹"], ["Où sont les toilettes?", "우 쏭 레 투알레트"]],
  de: [["Gute Reise!", "구테 라이제"], ["Grüezi!", "그뤼에치"], ["Danke!", "당케"], ["Wie viel kostet das?", "비 필 코스텟 다스"], ["Das hier, bitte", "다스 히어 비테"],
    ["Zahlen, bitte", "찰렌 비테"], ["Sehr lecker!", "제어 레커"], ["Geht's etwas günstiger?", "게츠 에트바스 귄스티거"], ["Wo ist die Toilette?", "보 이스트 디 토알레테"]],
  hi: [["शुभ यात्रा!", "슈브 야트라"], ["नमस्ते", "나마스테"], ["धन्यवाद", "단야와드"], ["कितने का है?", "끼뜨네 까 해"], ["यह दीजिए", "예 디지에"],
    ["बिल दीजिए", "빌 디지에"], ["बहुत स्वादिष्ट!", "바후뜨 스와디슈트"], ["थोड़ा कम कीजिए", "토라 깜 끼지에"], ["टॉयलेट कहाँ है?", "토일렛 까한 해"]],
  es: [["¡Buen viaje!", "부엔 비아헤"], ["¡Hola!", "올라"], ["¡Gracias!", "그라시아스"], ["¿Cuánto cuesta?", "쿠안토 쿠에스타"], ["Quiero este", "키에로 에스테"],
    ["La cuenta, por favor", "라 쿠엔타 포르 파보르"], ["¡Qué rico!", "케 리코"], ["¿Me hace un descuento?", "메 아세 운 데스쿠엔토"], ["¿Dónde está el baño?", "돈데 에스타 엘 바뇨"]],
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
