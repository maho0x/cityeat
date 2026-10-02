import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOtpEmail } from "./email";
import { isCityUEmail, normalizeEmail } from "./email-domain";
import { randomNickname } from "./nickname";

const EMAIL_PATHS = new Set([
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
]);

export const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean),
);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "user" },
      banned: { type: "boolean", input: false, defaultValue: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true, window: 60, max: 60 },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!EMAIL_PATHS.has(ctx.path)) return;
      const email = String(ctx.body?.email ?? "");
      if (!isCityUEmail(email)) {
        throw new APIError("FORBIDDEN", {
          code: "NOT_CITYU_EMAIL",
          message: "Only CityU email addresses can sign in.",
        });
      }
      const existing = await db.query.user.findFirst({
        where: eq(schema.user.email, normalizeEmail(email)),
        columns: { banned: true },
      });
      if (existing?.banned) {
        throw new APIError("FORBIDDEN", {
          code: "BANNED",
          message: "This account has been suspended.",
        });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          const email = normalizeEmail(u.email);
          return {
            data: {
              ...u,
              email,
              name: u.name || randomNickname(),
              role: adminEmails.has(email) ? "admin" : "user",
            },
          };
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      // Lets end-to-end tests sign in without reading email. Never in
      // production. The key must be absent (not undefined) otherwise.
      ...(process.env.NODE_ENV !== "production" && process.env.E2E_FIXED_OTP
        ? { generateOTP: () => process.env.E2E_FIXED_OTP }
        : {}),
      async sendVerificationOTP({ email, otp }) {
        await sendOtpEmail(email, otp);
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
