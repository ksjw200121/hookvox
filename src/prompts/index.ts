export type Industry =
  | "INSURANCE"
  | "REALESTATE"
  | "BEAUTY_CLIENT"
  | "FITNESS"
  | "CONSULTANT"
  | "GENERAL"
  | "RECIPE"
  | "TRAVEL"
  | "RESTAURANT"
  | "ASTROLOGY"
  | "CONVENIENCE"
  | "MAKEUP";

// 這些行業「預設」會生成分鏡，但用戶可以手動勾選任何行業
export const INDUSTRIES_WITH_STORYBOARD: Industry[] = [
  "RECIPE",
  "BEAUTY_CLIENT",
  "MAKEUP",
  "RESTAURANT",
  "TRAVEL",
];

// 各行業每個欄位的說明文字
export const FIELD_GUIDE: Record<Industry, {
  topic: string;
  topicPlaceholder: string;
  audience: string;
  audiencePlaceholder: string;
  cta: string;
  ctaPlaceholder: string;
  substitution: string;
  substitutionPlaceholder: string;
}> = {
  RECIPE: {
    topic: "你要教做什麼料理？",
    topicPlaceholder: "例如：氣炸雞胸肉、低卡牛排、5分鐘韓式炒飯",
    audience: "這道料理是給誰的？",
    audiencePlaceholder: "例如：想減肥的上班族、忙碌的媽媽、剛學煮飯的新手",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言說想學、收藏這個食譜、追蹤看更多",
    substitution: "原影片的食材是什麼，你要換成什麼？",
    substitutionPlaceholder: "例如：換成牛排、改成全素版本、換成氣炸鍋做法",
  },
  RESTAURANT: {
    topic: "你要介紹哪家店或哪道菜？",
    topicPlaceholder: "例如：台中隱藏版牛排、士林夜市必吃、CP值最高火鍋",
    audience: "你的觀眾是誰？",
    audiencePlaceholder: "例如：台中在地人、週末出遊的家庭、喜歡吃肉的老饕",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言說想去、收藏、私訊問地址",
    substitution: "原影片介紹的是哪家店，你要換成哪家？",
    substitutionPlaceholder: "例如：換成我台中的店、改成另一家餐廳、換成夜市攤位",
  },
  BEAUTY_CLIENT: {
    topic: "你要介紹什麼美容服務？",
    topicPlaceholder: "例如：霧眉、眼線、臉部緊緻療程",
    audience: "你的目標客戶是誰？",
    audiencePlaceholder: "例如：不想每天畫眉的上班族女生、出油嚴重想改善膚質的人",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：私訊預約、留言想了解、點連結看更多案例",
    substitution: "原影片是什麼服務，你要換成什麼？",
    substitutionPlaceholder: "例如：換成紋唇、改成眼線、換成臉部保養療程",
  },
  MAKEUP: {
    topic: "你要教什麼妝容？",
    topicPlaceholder: "例如：韓系日常妝、5分鐘上班妝、新手眼影畫法",
    audience: "這個妝是給誰的？",
    audiencePlaceholder: "例如：剛學化妝的新手、趕時間的上班族、喜歡韓系風格的人",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：收藏教學、留言說想學哪款妝、追蹤看更多",
    substitution: "原影片是什麼妝，你要改成什麼？",
    substitutionPlaceholder: "例如：換成煙燻妝、改成日常裸妝、換成新娘妝",
  },
  TRAVEL: {
    topic: "你要介紹哪個地方或行程？",
    topicPlaceholder: "例如：日本大阪3天行程、台東秘境海灘、宜蘭一日遊懶人包",
    audience: "你的觀眾是誰？",
    audiencePlaceholder: "例如：喜歡自由行的情侶、帶小孩的家庭、預算有限的學生",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：收藏行程、留言說想去、私訊要完整攻略",
    substitution: "原影片去哪裡，你要換成哪裡？",
    substitutionPlaceholder: "例如：換成台南景點、改成韓國首爾行程、換成台中一日遊",
  },
  INSURANCE: {
    topic: "你要講什麼保險或退休相關主題？",
    topicPlaceholder: "例如：勞保年金試算、遺囑規劃注意事項、節稅策略",
    audience: "你的目標受眾是誰？",
    audiencePlaceholder: "例如：快退休的50歲族群、有房產想傳承的人、剛出社會不懂保險的新鮮人",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言+1要試算表、私訊諮詢、預約說明會",
    substitution: "原影片在講什麼，你要換成哪個主題？",
    substitutionPlaceholder: "例如：換成遺囑規劃、改成贈與節稅、換成勞退自提試算",
  },
  REALESTATE: {
    topic: "你要講什麼房地產相關主題？",
    topicPlaceholder: "例如：首購族注意事項、中古屋vs預售屋差異、台中房市分析",
    audience: "你的目標受眾是誰？",
    audiencePlaceholder: "例如：想買第一間房的30歲、租屋想轉買房的人、有閒置資金想投資的人",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言+1、私訊諮詢、預約帶看",
    substitution: "原影片在講什麼，你要換成哪個主題？",
    substitutionPlaceholder: "例如：換成台中市場分析、改成租屋族必知、換成投資客視角",
  },
  FITNESS: {
    topic: "你要教什麼訓練或飲食方法？",
    topicPlaceholder: "例如：居家減脂訓練、高蛋白飲食規劃、新手必學深蹲姿勢",
    audience: "你的目標受眾是誰？",
    audiencePlaceholder: "例如：沒時間去健身房的上班族、產後想恢復身材的媽媽、想練胸肌的新手",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：收藏訓練計畫、留言要菜單、追蹤每週更新",
    substitution: "原影片是什麼訓練，你要換成什麼？",
    substitutionPlaceholder: "例如：換成居家版本、改成女生版本、換成老年人適合的動作",
  },
  CONSULTANT: {
    topic: "你要分享什麼行業知識或業務技巧？",
    topicPlaceholder: "例如：客戶開發心法、提案話術、如何讓客戶主動找你",
    audience: "你的目標受眾是誰？",
    audiencePlaceholder: "例如：剛入行的業務新手、想突破業績瓶頸的人、B2B業務",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言分享你遇到的問題、私訊諮詢、追蹤看更多",
    substitution: "原影片在講什麼，你要換成你的行業？",
    substitutionPlaceholder: "例如：換成我的行業、改成B2B客戶情境、換成新手創業場景",
  },
  ASTROLOGY: {
    topic: "你要講哪個星座或哪個主題的運勢？",
    topicPlaceholder: "例如：天蠍座2026感情運、牡羊座下半年財運、水星逆行影響",
    audience: "你的目標受眾是誰？",
    audiencePlaceholder: "例如：在感情上迷茫的人、想了解自己個性的人、喜歡星座的女生",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言你的星座、收藏這個分析、追蹤看每月運勢",
    substitution: "原影片講的是哪個星座，你要換成哪個？",
    substitutionPlaceholder: "例如：換成天蠍座、改成上升星座、換成感情運主題",
  },
  CONVENIENCE: {
    topic: "你要介紹什麼超商新品或主題？",
    topicPlaceholder: "例如：7-11本週新品開箱、全家限定聯名、超商隱藏版吃法",
    audience: "你的觀眾是誰？",
    audiencePlaceholder: "例如：每天去超商的上班族、喜歡嘗鮮的年輕人、省錢族",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言說你買了沒、收藏、追蹤下次開箱",
    substitution: "原影片介紹的是哪家超商，你要換成哪家？",
    substitutionPlaceholder: "例如：換成全家、改成萊爾富、換成OK超商",
  },
  GENERAL: {
    topic: "你的影片主題是什麼？",
    topicPlaceholder: "例如：30歲存第一桶金方法、新手學投資第一步、打工換宿心得",
    audience: "你的目標觀眾是誰？他們有什麼煩惱？",
    audiencePlaceholder: "例如：月薪3萬不知如何存錢的上班族、想改變生活但不知從哪開始的人",
    cta: "你希望觀眾看完做什麼？",
    ctaPlaceholder: "例如：留言分享你的方法、收藏這個影片、追蹤獲得更多",
    substitution: "原影片在講什麼，你要換成你自己的主題？",
    substitutionPlaceholder: "例如：換成我的行業、改成台灣在地案例、換成我自己的故事",
  },
};

const BRAND_STYLE = `
你是台灣短影音內容創作者，不是老師，不是在寫文章。

規則：
1. 用繁體中文
2. 白話、直接、像真人說話
3. 句子短
4. 不要官腔
5. 不要 AI 腔
6. 前三秒就進主題
7. 要讓觀眾覺得「這在說我」

禁止句型：
- 今天來跟大家分享
- 你一定要知道
- 非常重要
- 讓我們一起了解
- 希望這些資訊對你有幫助
- 當你面臨
- 如果你正在
`;

export function getScriptGenerationPrompt(params: {
  industry: Industry;
  topic: string;
  targetAudience: string;
  ctaGoal: string;
  viralAnalysis?: any;
  substitution?: string;
}): string {
  const { industry, topic, targetAudience, ctaGoal, viralAnalysis, substitution } = params;

  const substitutionBlock = substitution
    ? `
━━━━━━━━━━━━━━━━━━━━━━
【重要：內容替換指示】

原影片的主角／主題：「${viralAnalysis?.coreTopic || topic}」
用戶要替換成：「${substitution}」

你必須：
1. 完整保留原影片的爆款公式、節奏、Hook結構
2. 把所有內容主角替換成「${substitution}」
3. 舉例、場景、數字都要配合「${substitution}」重新設計
4. 不要保留任何原影片的具體細節，只保留「結構」和「情緒邏輯」
━━━━━━━━━━━━━━━━━━━━━━`
    : "";

  return `
${BRAND_STYLE}

你現在要寫的是「短影音逐字稿」，不是文章。

產業：${industry}
主題：${substitution || topic}
目標受眾：${targetAudience}
CTA目標：${ctaGoal}
${substitutionBlock}

以下是爆款分析結果，請學它的節奏和結構，不要照抄：

${JSON.stringify(viralAnalysis || {}, null, 2)}

寫作要求：
1. 每句一行
2. 每句不要太長
3. 開頭一定要有鉤子
4. 要像真人在鏡頭前講話
5. 不要像老師上課
6. 中間一定要有一個具體案例或情境
7. 只講一個重點，不要貪多
8. CTA 要具體

請生成 3 個版本：
- A：對話演戲型
- B：數字衝擊型
- C：身份認同型

重要：script 欄位裡的換行請用 \\n 表示，不要用真正的換行符號。

請只回傳合法 JSON，不要 markdown，不要任何多餘說明，直接從 { 開始。

{
  "scripts": [
    { "version": "A", "hook": "開頭鉤子", "script": "第一句\\n第二句\\n第三句", "cta": "結尾CTA" },
    { "version": "B", "hook": "開頭鉤子", "script": "第一句\\n第二句\\n第三句", "cta": "結尾CTA" },
    { "version": "C", "hook": "開頭鉤子", "script": "第一句\\n第二句\\n第三句", "cta": "結尾CTA" }
  ]
}
`;
}

export function getTitleGenerationPrompt(params: {
  industry: Industry;
  topic: string;
  targetAudience: string;
  viralAnalysis?: any;
  substitution?: string;
}): string {
  const { industry, topic, targetAudience, viralAnalysis, substitution } = params;

  return `
${BRAND_STYLE}

你是短影音爆款標題專家。

產業：${industry}
主題：${substitution || topic}
目標受眾：${targetAudience}
${substitution ? `\n注意：標題主角是「${substitution}」，不是原影片的主題。` : ""}

參考爆款公式（只學結構與情緒，不要照抄字句）：
${JSON.stringify(viralAnalysis || {}, null, 2)}

【標題要求】
1. 共 8 個，句型要多元，不要 8 個都同一種寫法。
2. 可涵蓋：數字型、問句型、反差/反常識型、恐懼/警示型、身份認同型、利益/結果型、對話型。
3. 短、狠、有情緒、有點擊感，像台灣創作者真的會發的。
4. 禁止 AI 腔與廢話，例如：「你一定要知道的〇〇」「當你面臨〇〇時」「希望這些對你有幫助」「讓我們一起了解」。

【好標題範例感】前 3 秒就想點、有具體數字或結果、戳中焦慮或渴望、像在對「我」說話。

請只回傳合法 JSON，不要 markdown，直接從 { 開始。

{
  "titles": ["標題1","標題2","標題3","標題4","標題5","標題6","標題7","標題8"]
}
`;
}

export function getStoryboardPrompt(params: {
  industry: Industry;
  topic: string;
  script: string;
  substitution?: string;
}): string {
  const { industry, topic, script, substitution } = params;

  const industryGuide: Partial<Record<Industry, string>> = {
    RECIPE: `食譜分鏡重點：開場食物成品特寫讓人流口水、每步驟有畫面、食材特寫強調質感、結尾多角度展示完成品、字幕標出份量和時間`,
    BEAUTY_CLIENT: `美業分鏡重點：開場Before素顏、過程展示手法和工具、After強烈對比、局部特寫效果、顧客真實自然的反應`,
    MAKEUP: `彩妝分鏡重點：開場展示完成妝效、每步驟有產品特寫、臉部局部特寫、工具使用手法清楚、結尾前後對比`,
    RESTAURANT: `探店分鏡重點：開場用最吸引人的菜、環境氛圍3-5秒、每道菜特寫（切開/拉絲/冒煙）、真實吃的反應表情、價格資訊入鏡`,
    TRAVEL: `旅遊分鏡重點：開場最美最衝擊的畫面、地標特寫+大景、人物融入場景、實用資訊入鏡（票價/交通）、結尾最治癒的畫面`,
  };

  const guide = industryGuide[industry] || "清楚展示主題，每個畫面有明確目的，注意節奏感";
  const effectiveTopic = substitution || topic;

  return `
你是短影音分鏡師，幫台灣創作者規劃 IG Reels / TikTok 的分鏡。

產業：${industry}
主題：${effectiveTopic}
${substitution ? `分鏡主角是「${substitution}」，完全按照這個規劃畫面。` : ""}

行業分鏡重點：${guide}

腳本：
${script}

請規劃「剛好 8 個」分鏡畫面，不要超過 8 個。

請只回傳合法 JSON，不要 markdown，直接從 { 開始。

{
  "storyboard": [
    {
      "scene": 1,
      "timeRange": "0-3秒",
      "shotType": "特寫",
      "visualContent": "畫面要拍什麼",
      "voiceover": "這個畫面說的台詞（沒有就填空字串）",
      "caption": "疊加字幕（沒有就填空字串）",
      "shootingTip": "給創作者的拍攝建議"
    }
  ]
}
`;
}

export function getAnalyzeContentPrompt(params: {
  transcript?: string;
  urlAnalysis?: {
    platform?: string;
    title?: string;
    description?: string;
    author?: string;
    resolvedText?: string;
    rawMeta?: Record<string, string>;
  };
}): string {
  const { transcript, urlAnalysis } = params;

  return `
你是短影音爆款內容分析師。
你要分析這支影片為什麼容易吸引人、為什麼有機會爆，並整理出後續可拿來改寫腳本的重點。

規則：
1. 用繁體中文
2. 分析要白話、直接
3. 不要寫成文章
4. 要提煉出可複用的爆款結構
5. 如果逐字稿不足，就參考網址解析內容一起判斷
6. 不要亂掰看不到的資訊
7. 請只回傳合法 JSON，不要 markdown，不要任何多餘文字，直接從 { 開始

【逐字稿】
${transcript || ""}

【網址解析資訊】
${JSON.stringify(urlAnalysis || {}, null, 2)}

請輸出成以下 JSON 格式：

{
  "coreTopic": "這支影片核心在講什麼",
  "targetAudience": "這支影片主要在打誰",
  "hookStyle": "開頭鉤子的類型",
  "emotionalTriggers": ["情緒點1", "情緒點2", "情緒點3"],
  "contentStructure": ["步驟1", "步驟2", "步驟3", "步驟4"],
  "persuasionMechanics": ["說服機制1", "說服機制2", "說服機制3"],
  "keyAngles": ["可借用角度1", "可借用角度2", "可借用角度3"],
  "ctaStyle": "這支影片最後怎麼引導互動或轉換",
  "summary": "用白話總結這支影片為什麼有效"
}
`;
}

export function getIdeaGenerationPrompt(params: {
  topic: string;
  industry?: Industry;
  targetAudience?: string;
}): string {
  const { topic, industry = "GENERAL", targetAudience = "" } = params;

  return `
${BRAND_STYLE}

你是短影音企劃發想助手。

任務：
根據用戶主題，產出適合短影音的內容點子。
重點是要能拍、能講、能吸引人，不要太空泛。

產業：${industry}
主題：${topic}
目標受眾：${targetAudience}

請生成 10 個短影音主題點子。

每個點子都要包含：
1. title：題目
2. hook：開頭一句
3. angle：這支影片切入角度
4. whyItWorks：為什麼這題容易吸引人

請只回傳合法 JSON，不要 markdown，不要多餘說明，直接從 { 開始。

{
  "ideas": [
    {
      "title": "點子1",
      "hook": "開頭鉤子",
      "angle": "切入角度",
      "whyItWorks": "為什麼有效"
    }
  ]
}
`;
}