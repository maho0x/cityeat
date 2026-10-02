"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/forms/fields";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { isCityUEmail } from "@/lib/email-domain";

const RESEND_SECONDS = 60;

/** Accept a bare EID as a student address. */
function toEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@my.cityu.edu.hk`;
}

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function messageFor(err: { code?: string; status?: number } | null) {
    if (!err) return t("failed");
    if (err.code === "NOT_CITYU_EMAIL") return t("notCityU");
    if (err.code === "BANNED") return t("banned");
    if (err.status === 429 || err.code === "TOO_MANY_ATTEMPTS")
      return t("tooMany");
    if (err.code === "INVALID_OTP" || err.code === "OTP_EXPIRED")
      return t("invalidCode");
    return t("failed");
  }

  async function sendCode() {
    const address = toEmail(email);
    if (!isCityUEmail(address)) {
      setError(t("notCityU"));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: address,
      type: "sign-in",
    });
    setBusy(false);
    if (error) return setError(messageFor(error));
    setEmail(address);
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
  }

  async function verify(otp: string) {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      setBusy(false);
      setCode("");
      return setError(messageFor(error));
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[28px] leading-tight font-black tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{t("subtitle")}</p>

      {step === "email" ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold">{t("email")}</span>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              aria-invalid={!!error}
              className="h-12 w-full rounded-xl border bg-card px-4 text-[16px] outline-none placeholder:text-muted-foreground focus:border-foreground/40 aria-invalid:border-destructive"
            />
          </label>
          {error && (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          )}
          <PrimaryButton pending={busy}>
            {busy ? t("sending") : t("sendCode")}
          </PrimaryButton>
          <p className="text-[12px] text-muted-foreground">{t("privacy")}</p>
        </form>
      ) : (
        <div className="mt-8 space-y-5">
          <p className="text-[15px]">{t("codeSent", { email })}</p>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (v.length === 6) verify(v);
            }}
            disabled={busy}
            autoFocus
            inputMode="numeric"
            pattern="^[0-9]*$"
            aria-label={t("code")}
          >
            <InputOTPGroup className="w-full justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="size-12 rounded-xl border bg-card text-[22px] font-bold first:rounded-xl first:border last:rounded-xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {busy && (
            <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("verifying")}
            </p>
          )}
          {error && (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between text-[14px]">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("changeEmail")}
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={sendCode}
              className="font-medium text-brand disabled:text-muted-foreground"
            >
              {cooldown > 0 ? t("resendIn", { s: cooldown }) : t("resend")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
