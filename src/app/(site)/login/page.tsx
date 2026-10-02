import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/site/login-form";
import { getViewer } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("signIn") };
}

/** Only allow same-site relative redirects. */
function safeNext(next: unknown) {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? next
    : "/";
}

export default async function LoginPage(props: PageProps<"/login">) {
  const next = safeNext((await props.searchParams).next);
  if (await getViewer()) redirect(next);
  return (
    <div className="mx-auto max-w-sm pt-6 md:pt-16">
      <LoginForm next={next} />
    </div>
  );
}
