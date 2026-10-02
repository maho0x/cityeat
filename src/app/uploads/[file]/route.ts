import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/upload";

const FILE_RE = /^[A-Za-z0-9_-]{16}(_t)?\.webp$/;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/uploads/[file]">,
) {
  const { file } = await ctx.params;
  if (!FILE_RE.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
