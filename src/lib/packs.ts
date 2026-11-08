import packsI18n from "@/data/packs-i18n.json";
import type { Locale } from "@/lib/i18n";

/**
 * Pack names as shown in the Korean release of Rotaeno, keyed by the pack name
 * used in the rating sheet (Chinese). Categories and order follow the in-game
 * song select (top → bottom).
 */
export const PACK_CATEGORIES: { name: string; packs: [cn: string, ko: string][] }[] = [
  {
    name: "메인 스토리",
    packs: [
      ["基础歌曲", "기본 악곡"],
      ["第一章-旅程的开始", "제1장 - 여정의 시작"],
      ["第二章-灾难与希望", "제2장 - 재난과 희망"],
      ["第三章-泾渭分明之地", "제3장 - 반으로 갈라진 땅"],
    ],
  },
  {
    name: "서브 스토리",
    packs: [
      ["小水滴大冒险", "작은 물방울의 대모험"],
      ["恒光予新生", "Everlight Reborn"],
      ["天空、飞船，与我所珍视的——", "하늘, 우주선, 그리고 내가 소중히 여기는——"],
      ["无尽的暑假狂想曲", "끝없는 여름방학 환상곡"],
      ["Rotaeno学园祭", "로테이노 학원 축제"],
      ["新时代", "새로운 시대"],
      ["我们的相遇", "우리의 만남"],
      ["轨迹：梦想萌芽的那一天", "궤적：꿈이 싹튼 날"],
    ],
  },
  {
    name: "콜라보",
    packs: [
      ["maimai联动", "maimai 콜라보"],
      ["WACCA联动 II", "WACCA 콜라보 II"],
      ["Mili精选辑", "Mili 컬렉션"],
      ["宇宙电台2025", "Cosmic Radio 2025"],
      ["Dynamix Universe 联动", "Dynamix Universe 콜라보"],
      ["KALPA: Cosmic Symphony 联动", "KALPA: Cosmic Symphony 콜라보"],
      ["Cytus II 联动", "Cytus II 콜라보"],
      ["Tanchiky精选集", "Tanchiky 컬렉션"],
      ["NOISZ SL + PK GODHAND 联动", "NOISZ SL + PK GODHAND 콜라보"],
      ["Muse Dash联动", "Muse Dash 콜라보"],
      ["DEEMOII联动", "DEEMO II 콜라보"],
      ["Dynamix联动", "Dynamix 콜라보"],
      ["律动轨迹联动", "Rizline 콜라보"],
      ["范式：起源联动", "Paradigm: Reboot 콜라보"],
      ["Arcaea联动", "Arcaea 콜라보"],
      ["音波狂潮", "LiveMania"],
      ["Lanota联动", "Lanota 콜라보"],
      ["HARDCORE TANO*C联动 II", "HARDCORE TANO*C 콜라보 II"],
      ["HARDCORE TANO*C联动 I", "HARDCORE TANO*C 콜라보 I"],
      ["Phigros联动", "Phigros(피그로스) 콜라보레이션"],
      ["KALPA联动", "KALPA 콜라보레이션"],
      ["WACCA联动 I", "WACCA 콜라보 I"],
    ],
  },
  {
    name: "Virtual/Singer",
    packs: [
      ["向未来之声", "미래를 향한 목소리"],
      ["跨次元之约", "새로운 차원간의 약속"],
      ["DECO*27联动", "DECO*27 콜라보"],
      ["PinocchioP联动", "PinocchioP 콜라보"],
      ["自未来的歌", "미래로부터"],
      ["深夏清梦", "한여름날의 꿈"],
    ],
  },
  {
    name: "음악팩",
    packs: [
      ["随风而行", "바람을 타고"],
      ["幻境迷踪", "원더랜드로 가는 열쇠"],
      ["核意味?!", "WAHT the CORE?!"],
      ["黄金时代", "황금시대"],
      ["冬雪下的回忆", "겨울눈 아래의 추억"],
      ["Ψ：脑波过载", "Ψ: 뇌파 오버로드"],
      ["异世界：追忆", "이세계 이야기: 추억"],
      ["音脉相承", "음맥상통"],
      ["炽热之心", "블레이징 하트"],
      ["紫夜狂欢", "퍼플 레이브"],
      ["放克派对", "펑키 파티"],
      ["奥比之声", "오브의 소리"],
      ["透明色", "투명색"],
      ["钢琴人生", "피아노 라이프"],
      ["几何律动", "지오메트릭 펄스"],
      ["巷角餐馆", "골목 식당"],
      ["机械都市", "메카니컬 시티"],
    ],
  },
  { name: "성간 항해", packs: [["ROCK (Y)OUR WORLD", "Rock (Y)our World"]] },
  { name: "싱글", packs: [["星际之声", "우주의 목소리"]] },
  { name: "기타", packs: [["星觅典藏", "별탐구 컬렉션"]] },
];

/** Category labels: Korean from the game, Chinese from the CN wiki, Japanese translated. */
const CATEGORY_I18N: Record<string, { ja: string; zh: string }> = {
  "메인 스토리": { ja: "メインストーリー", zh: "主线故事" },
  "서브 스토리": { ja: "サブストーリー", zh: "支线故事" },
  콜라보: { ja: "コラボ", zh: "联动" },
  "Virtual/Singer": { ja: "Virtual/Singer", zh: "Virtual/Singer" },
  음악팩: { ja: "楽曲パック", zh: "曲包" },
  "성간 항해": { ja: "星間航行", zh: "星际航行" },
  싱글: { ja: "シングル", zh: "单曲" },
  기타: { ja: "その他", zh: "其他" },
  "새 팩": { ja: "新しいパック", zh: "新曲包" },
};
/** Pack names in Japanese / Chinese from the CN wiki's song list (src/data/packs-i18n.json). */
const PACK_I18N = packsI18n as Record<string, { ja: string; zh: string }>;

const KO = new Map<string, { ko: string; category: string; order: number }>();
let order = 0;
for (const c of PACK_CATEGORIES) for (const [cn, ko] of c.packs) KO.set(cn, { ko, category: c.name, order: order++ });

const categoryLabel = (ko: string, l: Locale) => (l === "ko" ? ko : (CATEGORY_I18N[ko]?.[l] ?? ko));

/** Display name of a sheet pack name in the given language; unknown (newer) packs keep their sheet name. */
export function packName(pack: string, l: Locale = "ko"): string {
  if (l !== "ko") return PACK_I18N[pack]?.[l] ?? KO.get(pack)?.ko ?? pack;
  return KO.get(pack)?.ko ?? pack;
}

export function packCategory(pack: string, l: Locale = "ko"): string | null {
  const c = KO.get(pack)?.category;
  return c ? categoryLabel(c, l) : null;
}

/** Groups the given sheet pack names by in-game category, in in-game order. Unknown packs go last. */
export function groupPacks(packs: Iterable<string>, l: Locale = "ko"): { category: string; packs: { value: string; label: string }[] }[] {
  const known = new Map<string, { value: string; label: string; order: number }[]>();
  const unknown: { value: string; label: string }[] = [];
  for (const p of new Set(packs)) {
    const k = KO.get(p);
    if (!k) unknown.push({ value: p, label: p });
    else {
      const list = known.get(k.category) ?? [];
      list.push({ value: p, label: packName(p, l), order: k.order });
      known.set(k.category, list);
    }
  }
  const out = PACK_CATEGORIES.filter((c) => known.has(c.name)).map((c) => ({
    category: categoryLabel(c.name, l),
    packs: known.get(c.name)!.sort((a, b) => a.order - b.order).map(({ value, label }) => ({ value, label })),
  }));
  if (unknown.length) out.push({ category: categoryLabel("새 팩", l), packs: unknown.sort((a, b) => a.label.localeCompare(b.label)) });
  return out;
}
