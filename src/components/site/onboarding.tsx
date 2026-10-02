"use client";

import { Clock, Dices, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/forms/fields";
import { Sheet } from "@/components/forms/sheet";

const KEY = "onboarded";

export function Onboarding() {
  const t = useTranslations("onboarding");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {}
  }, []);
  const done = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  const steps = [
    { icon: Clock, text: t("step1") },
    { icon: Dices, text: t("step2") },
    { icon: PencilLine, text: t("step3") },
  ];
  return (
    <Sheet open={open} onOpenChange={(o) => !o && done()} title={t("title")}>
      <ul className="space-y-4">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-[15px]">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon className="size-[18px]" />
            </span>
            <span className="pt-1.5">{text}</span>
          </li>
        ))}
      </ul>
      <PrimaryButton type="button" onClick={done} className="mt-6">
        {t("done")}
      </PrimaryButton>
    </Sheet>
  );
}
