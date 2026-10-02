/**
 * Seed data from the official CityU catering directory
 * (https://www.cityu.edu.hk/directories/catering, fetched 2026-10-02).
 * Prices are rough estimates and flagged as unverified in the UI.
 */

type Hours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, [string, string][]>>;

export type SeedArea = {
  slug: string;
  nameZh: string;
  nameEn: string;
};

export type SeedRestaurant = {
  slug: string;
  nameZh: string;
  nameEn: string;
  area: string;
  locationZh: string;
  locationEn: string;
  tags: string[];
  price: [number, number];
  payment: string[];
  phone: string;
  hours: Hours;
};

export const areas: SeedArea[] = [
  { slug: "ac1", nameZh: "AC1 中銀綜合樓", nameEn: "AC1 · BOC Complex" },
  {
    slug: "ac2",
    nameZh: "AC2 李達三葉耀珍學術樓",
    nameEn: "AC2 · Li Dak Sum Yip Yio Chin",
  },
  { slug: "ac3", nameZh: "AC3 劉鳴煒學術樓", nameEn: "AC3 · Lau Ming Wai" },
  { slug: "yeung", nameZh: "楊建文學術樓", nameEn: "Yeung Kin Man Building" },
  {
    slug: "cmc",
    nameZh: "邵逸夫創意媒體中心",
    nameEn: "Creative Media Centre",
  },
  {
    slug: "lodge",
    nameZh: "學術交流大樓",
    nameEn: "Academic Exchange Building",
  },
  { slug: "residence", nameZh: "學生宿舍", nameEn: "Student Residence" },
];

const every = (open: string, close: string, holiday = true): Hours => ({
  0: [[open, close]],
  1: [[open, close]],
  2: [[open, close]],
  3: [[open, close]],
  4: [[open, close]],
  5: [[open, close]],
  6: [[open, close]],
  ...(holiday ? { 7: [[open, close]] } : {}),
});

const weekdays = (open: string, close: string): Hours => ({
  1: [[open, close]],
  2: [[open, close]],
  3: [[open, close]],
  4: [[open, close]],
  5: [[open, close]],
});

const CARDS = ["cash", "credit_card", "octopus", "alipay_hk", "wechat_pay_hk"];

export const restaurants: SeedRestaurant[] = [
  {
    slug: "city-express",
    nameZh: "城大食坊",
    nameEn: "City Express",
    area: "ac1",
    locationZh: "中國銀行（香港）綜合樓 5 樓",
    locationEn: "5/F, Bank of China (Hong Kong) Complex",
    tags: ["fast_food", "canteen"],
    price: [30, 50],
    payment: [...CARDS, "apple_pay", "boc_pay", "payme"],
    phone: "+852 2971 0668",
    hours: every("07:30", "21:00"),
  },
  {
    slug: "ac2-canteen",
    nameZh: "AC2 飯堂",
    nameEn: "AC2 Canteen",
    area: "ac2",
    locationZh: "李達三葉耀珍學術樓 3 樓",
    locationEn: "3/F, Li Dak Sum Yip Yio Chin Academic Building",
    tags: ["fast_food", "canteen"],
    price: [30, 50],
    payment: [...CARDS, "apple_pay", "boc_pay", "payme", "unionpay"],
    phone: "+852 2312 7928",
    hours: every("07:30", "21:00"),
  },
  {
    slug: "ac3-bistro",
    nameZh: "AC3 Bistro",
    nameEn: "AC3 Bistro",
    area: "ac3",
    locationZh: "劉鳴煒學術樓 7 樓",
    locationEn: "7/F, Lau Ming Wai Academic Building",
    tags: ["western"],
    price: [40, 70],
    payment: CARDS,
    phone: "+852 4683 4908",
    hours: {
      1: [["07:30", "21:00"]],
      2: [["07:30", "21:00"]],
      3: [["07:30", "21:00"]],
      4: [["07:30", "21:00"]],
      5: [["07:30", "21:00"]],
      6: [["07:30", "21:00"]],
    },
  },
  {
    slug: "city-chinese-restaurant",
    nameZh: "城大中菜廳",
    nameEn: "City Chinese Restaurant",
    area: "ac1",
    locationZh: "中國銀行（香港）綜合樓 8 樓",
    locationEn: "8/F, Bank of China (Hong Kong) Complex",
    tags: ["chinese", "dim_sum"],
    price: [80, 200],
    payment: ["cash"],
    phone: "+852 3442 8163",
    hours: {
      0: [["09:30", "22:30"]],
      1: [["11:00", "22:30"]],
      2: [["11:00", "22:30"]],
      3: [["11:00", "22:30"]],
      4: [["11:00", "22:30"]],
      5: [["11:00", "22:30"]],
      6: [["11:00", "22:30"]],
      7: [["09:30", "22:30"]],
    },
  },
  {
    slug: "faculty-lounge",
    nameZh: "Faculty Lounge",
    nameEn: "Faculty Lounge",
    area: "ac1",
    locationZh: "中國銀行（香港）綜合樓 9 樓",
    locationEn: "9/F, Bank of China (Hong Kong) Complex",
    tags: ["western"],
    price: [100, 250],
    payment: ["cash", "credit_card", "alipay_hk", "wechat_pay_hk"],
    phone: "+852 3442 8138",
    hours: every("11:00", "22:00"),
  },
  {
    slug: "lodge-bistro",
    nameZh: "Lodge Bistro",
    nameEn: "Lodge Bistro",
    area: "lodge",
    locationZh: "學術交流大樓 CityUHK Lodge 地下",
    locationEn: "G/F, CityUHK Lodge, Academic Exchange Building",
    tags: ["western"],
    price: [60, 120],
    payment: ["cash", "credit_card", "alipay_hk", "wechat_pay_hk"],
    phone: "+852 3442 3636",
    hours: every("07:30", "21:30"),
  },
  {
    slug: "cmcafe",
    nameZh: "CMCAFE",
    nameEn: "CMCAFE",
    area: "cmc",
    locationZh: "邵逸夫創意媒體中心 3 樓",
    locationEn: "3/F, Run Run Shaw Creative Media Centre",
    tags: ["cafe"],
    price: [20, 50],
    payment: ["cash"],
    phone: "+852 2778 7390",
    hours: { ...weekdays("08:00", "20:00"), 6: [["08:00", "17:00"]] },
  },
  {
    slug: "ac3-cafe",
    nameZh: "AC3 Café",
    nameEn: "The Street Cafe",
    area: "ac3",
    locationZh: "劉鳴煒學術樓 3 樓",
    locationEn: "3/F, Lau Ming Wai Academic Building",
    tags: ["cafe"],
    price: [20, 45],
    payment: ["cash"],
    phone: "+852 2450 1130",
    hours: {
      ...weekdays("07:30", "21:00"),
      0: [["09:00", "19:00"]],
      6: [["09:00", "19:00"]],
      7: [["09:00", "17:00"]],
    },
  },
  {
    slug: "5380-cafe",
    nameZh: "5380 Cafe（Kebab Station）",
    nameEn: "5380 Cafe (Kebab Station)",
    area: "ac1",
    locationZh: "中國銀行（香港）綜合樓 5 樓",
    locationEn: "5/F, Bank of China (Hong Kong) Complex",
    tags: ["halal", "kebab"],
    price: [40, 70],
    payment: ["cash", "octopus"],
    phone: "+852 2395 3155",
    hours: { ...weekdays("10:00", "20:00"), 6: [["10:00", "20:00"]] },
  },
  {
    slug: "coffee-cart",
    nameZh: "Coffee Cart",
    nameEn: "Coffee Cart",
    area: "yeung",
    locationZh: "楊建文學術樓 紫區 4 樓",
    locationEn: "Purple Zone, 4/F, Yeung Kin Man Academic Building",
    tags: ["cafe"],
    price: [20, 40],
    payment: [],
    phone: "+852 9583 4240",
    hours: { ...weekdays("08:00", "20:00"), 6: [["08:00", "17:00"]] },
  },
  {
    slug: "hall-canteen-mos",
    nameZh: "宿舍飯堂 @馬鞍山",
    nameEn: "Hall Canteen @MOS",
    area: "residence",
    locationZh: "馬鞍山彩沙街 2 號 李兆基學生宿舍村",
    locationEn: "Lee Shau Kee Student Residence Village, Ma On Shan",
    tags: ["fast_food", "canteen"],
    price: [30, 50],
    payment: CARDS,
    phone: "+852 9084 9071",
    hours: { ...weekdays("09:00", "20:00"), 6: [["09:00", "18:00"]] },
  },
];

export const holidays: { date: string; nameZh: string; nameEn: string }[] = [
  { date: "2026-01-01", nameZh: "一月一日", nameEn: "New Year's Day" },
  { date: "2026-02-17", nameZh: "農曆年初一", nameEn: "Lunar New Year's Day" },
  {
    date: "2026-02-18",
    nameZh: "農曆年初二",
    nameEn: "Second day of Lunar New Year",
  },
  {
    date: "2026-02-19",
    nameZh: "農曆年初三",
    nameEn: "Third day of Lunar New Year",
  },
  { date: "2026-04-03", nameZh: "耶穌受難節", nameEn: "Good Friday" },
  {
    date: "2026-04-04",
    nameZh: "耶穌受難節翌日",
    nameEn: "Day following Good Friday",
  },
  {
    date: "2026-04-06",
    nameZh: "清明節翌日",
    nameEn: "Day following Ching Ming Festival",
  },
  {
    date: "2026-04-07",
    nameZh: "復活節星期一翌日",
    nameEn: "Day following Easter Monday",
  },
  { date: "2026-05-01", nameZh: "勞動節", nameEn: "Labour Day" },
  {
    date: "2026-05-25",
    nameZh: "佛誕翌日",
    nameEn: "Day following the Birthday of the Buddha",
  },
  { date: "2026-06-19", nameZh: "端午節", nameEn: "Tuen Ng Festival" },
  {
    date: "2026-07-01",
    nameZh: "香港特別行政區成立紀念日",
    nameEn: "HKSAR Establishment Day",
  },
  {
    date: "2026-09-26",
    nameZh: "中秋節翌日",
    nameEn: "Day following Mid-Autumn Festival",
  },
  { date: "2026-10-01", nameZh: "國慶日", nameEn: "National Day" },
  {
    date: "2026-10-19",
    nameZh: "重陽節翌日",
    nameEn: "Day following Chung Yeung Festival",
  },
  { date: "2026-12-25", nameZh: "聖誕節", nameEn: "Christmas Day" },
  {
    date: "2026-12-26",
    nameZh: "聖誕節後第一個周日",
    nameEn: "First weekday after Christmas Day",
  },
  { date: "2027-01-01", nameZh: "一月一日", nameEn: "New Year's Day" },
  { date: "2027-02-06", nameZh: "農曆年初一", nameEn: "Lunar New Year's Day" },
  {
    date: "2027-02-08",
    nameZh: "農曆年初三",
    nameEn: "Third day of Lunar New Year",
  },
  {
    date: "2027-02-09",
    nameZh: "農曆年初四",
    nameEn: "Fourth day of Lunar New Year",
  },
  { date: "2027-03-26", nameZh: "耶穌受難節", nameEn: "Good Friday" },
  {
    date: "2027-03-27",
    nameZh: "耶穌受難節翌日",
    nameEn: "Day following Good Friday",
  },
  { date: "2027-03-29", nameZh: "復活節星期一", nameEn: "Easter Monday" },
  { date: "2027-04-05", nameZh: "清明節", nameEn: "Ching Ming Festival" },
  { date: "2027-05-01", nameZh: "勞動節", nameEn: "Labour Day" },
  { date: "2027-05-13", nameZh: "佛誕", nameEn: "Birthday of the Buddha" },
  { date: "2027-06-09", nameZh: "端午節", nameEn: "Tuen Ng Festival" },
  {
    date: "2027-07-01",
    nameZh: "香港特別行政區成立紀念日",
    nameEn: "HKSAR Establishment Day",
  },
  {
    date: "2027-09-16",
    nameZh: "中秋節翌日",
    nameEn: "Day following Mid-Autumn Festival",
  },
  { date: "2027-10-01", nameZh: "國慶日", nameEn: "National Day" },
  { date: "2027-10-08", nameZh: "重陽節", nameEn: "Chung Yeung Festival" },
  { date: "2027-12-25", nameZh: "聖誕節", nameEn: "Christmas Day" },
  {
    date: "2027-12-27",
    nameZh: "聖誕節後第一個周日",
    nameEn: "First weekday after Christmas Day",
  },
];

/**
 * Online-ordering links whose menus `scripts/menu-sync.ts` mirrors. A deleted
 * source comes back on the next seed, so disable it in /admin instead.
 */
export const menuSources: { restaurant: string; url: string }[] = [
  {
    restaurant: "ac2-canteen",
    url: "https://csd.order.place/home/store/312882?_aigens_source=scan",
  },
  {
    restaurant: "ac2-canteen",
    url: "https://csd.order.place/home/store/612882?_aigens_source=scan",
  },
  {
    restaurant: "ac2-canteen",
    url: "https://csd.order.place/store/712882/mode/pickup?_aigens_source=scan&onpremise=true",
  },
  {
    restaurant: "ac2-canteen",
    url: "https://scan.aigens.com/scan?code=c3RvcmU9MjEyODgyJm1vZGU9cGlja3VwJnBhZ2U9YnlvZA==",
  },
  {
    restaurant: "city-express",
    url: "https://csd.order.place/store/112870/mode/prekiosk?_aigens_source=scan&onpremise=true",
  },
];
