import { randomInt } from "node:crypto";

const ADJECTIVES = [
  "香脆",
  "金黃",
  "熱辣",
  "滑嫩",
  "酥香",
  "鬆軟",
  "甜蜜",
  "爽口",
  "暖心",
  "飽足",
  "鮮甜",
  "濃郁",
  "清爽",
  "惹味",
  "軟綿",
  "焦香",
];

const FOODS = [
  "菠蘿包",
  "蛋撻",
  "叉燒包",
  "燒賣",
  "魚蛋",
  "雞蛋仔",
  "奶茶",
  "鴛鴦",
  "腸粉",
  "蝦餃",
  "西多士",
  "豬扒包",
  "雲吞麵",
  "煲仔飯",
  "碗仔翅",
  "車仔麵",
  "檸檬茶",
  "芝麻卷",
  "豆腐花",
  "咖喱魚蛋",
];

/**
 * Default display name for a new account, e.g. "香脆菠蘿包 4821". Names are
 * not unique; the number just makes clashes rare. Replaces the old default
 * of the email's local part, which exposed the student's EID.
 */
export function randomNickname(): string {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const food = FOODS[randomInt(FOODS.length)];
  const num = String(randomInt(10_000)).padStart(4, "0");
  return `${adj}${food} ${num}`;
}
