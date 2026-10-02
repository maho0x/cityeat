import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { TabBar, TopNav } from "@/components/site/nav";
import { Onboarding } from "@/components/site/onboarding";
import { ViewerProvider } from "@/components/site/viewer-context";
import { getUnreadCount } from "@/lib/queries";
import { getViewer } from "@/lib/session";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const unread = viewer ? await getUnreadCount(viewer.id) : 0;
  return (
    <ViewerProvider
      viewer={
        viewer
          ? { id: viewer.id, name: viewer.name, isAdmin: viewer.isAdmin }
          : null
      }
    >
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <TopNav unread={unread} />
            {viewer?.isAdmin && (
              <Link
                href="/admin"
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:pb-16">
        {children}
      </main>
      <TabBar unread={unread} />
      <Onboarding />
    </ViewerProvider>
  );
}
