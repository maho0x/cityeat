"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ActionError } from "@/lib/action";

export function useActionError() {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  return (error: ActionError) => {
    const message = {
      UNAUTHENTICATED: ta("required"),
      FORBIDDEN: t("error"),
      INVALID: t("invalid"),
      RATE_LIMITED: t("rateLimited"),
      NOT_FOUND: t("notFound"),
      BAD_IMAGES: t("error"),
      SERVER: t("error"),
    }[error];
    toast.error(message);
  };
}
