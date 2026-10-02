"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext } from "react";

export type ClientViewer = {
  id: string;
  name: string;
  isAdmin: boolean;
} | null;

const ViewerContext = createContext<ClientViewer>(null);

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: ClientViewer;
  children: React.ReactNode;
}) {
  return <ViewerContext value={viewer}>{children}</ViewerContext>;
}

export function useViewer() {
  return useContext(ViewerContext);
}

/**
 * Returns a guard for write actions: when signed out it sends the user to the
 * login page (coming back here afterwards) and returns false.
 */
export function useRequireSignIn() {
  const viewer = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  return (next?: string) => {
    if (viewer) return true;
    const back = next ?? pathname;
    router.push(`/login?next=${encodeURIComponent(back)}`);
    return false;
  };
}
