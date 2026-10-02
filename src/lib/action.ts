import "server-only";
import { z } from "zod";
import { AuthError, requireAdmin, requireViewer, type Viewer } from "./session";

export type ActionError =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "BAD_IMAGES"
  | "SERVER";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export class ActionFail extends Error {
  constructor(public code: ActionError) {
    super(code);
  }
}

/**
 * Wrap a server action: validate input with zod, require a session (or an
 * admin), and map known failures to a typed error result.
 */
export function action<S extends z.ZodType, T>(
  schema: S,
  fn: (input: z.infer<S>, viewer: Viewer) => Promise<T>,
  opts: { admin?: boolean } = {},
) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const viewer = opts.admin ? await requireAdmin() : await requireViewer();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: "INVALID" };
      return { ok: true, data: await fn(parsed.data, viewer) };
    } catch (e) {
      if (e instanceof AuthError || e instanceof ActionFail) {
        return { ok: false, error: e.code };
      }
      console.error("[action] unexpected error", e);
      return { ok: false, error: "SERVER" };
    }
  };
}

export const imageIds = z.array(z.string().regex(/^[A-Za-z0-9_-]{16}$/)).max(9);
