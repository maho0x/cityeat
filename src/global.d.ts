import type messages from "../messages/zh-HK.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
    Locale: "zh-HK" | "en";
  }
}
