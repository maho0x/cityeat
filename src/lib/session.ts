import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { adminEmails, auth } from "./auth";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  isAdmin: boolean;
};

/** The signed-in user for this request, or null. Deduped per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  const { id, email, name, image, role } = session.user;
  return {
    id,
    email,
    name,
    image: image ?? null,
    isAdmin: role === "admin" || adminEmails.has(email),
  };
});

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError("UNAUTHENTICATED");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) throw new AuthError("FORBIDDEN");
  return viewer;
}
