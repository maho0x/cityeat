"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

type Pending = { key: string; preview: string };

/** Uploads images as soon as they're picked; `value` holds upload ids. */
export function ImagePicker({
  value,
  onChange,
  max = 9,
  onBusyChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useTranslations("upload");
  const inputId = useId();
  const [pending, setPending] = useState<Pending[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length - pending.length;
    const list = Array.from(files);
    if (list.length > room) toast.error(t("tooMany", { max }));
    const accepted = list.slice(0, Math.max(0, room)).filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(t("tooLarge"));
        return false;
      }
      return true;
    });
    if (!accepted.length) return;

    const items = accepted.map((file) => ({
      file,
      key: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
    }));
    setPending((p) => [...p, ...items]);
    onBusyChange?.(true);

    let ids = value;
    await Promise.all(
      items.map(async (item) => {
        const body = new FormData();
        body.append("file", item.file);
        try {
          const res = await fetch("/api/upload", { method: "POST", body });
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error === "BAD_TYPE" ? t("badType") : t("failed"));
            return;
          }
          ids = [...ids, json.id];
          onChange(ids);
        } catch {
          toast.error(t("failed"));
        } finally {
          URL.revokeObjectURL(item.preview);
          setPending((p) => p.filter((x) => x.key !== item.key));
        }
      }),
    );
    onBusyChange?.(false);
  }

  const full = value.length + pending.length >= max;

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {value.map((id) => (
        <div key={id} className="relative aspect-square">
          {/* biome-ignore lint/performance/noImgElement: local upload preview */}
          <img
            src={`/uploads/${id}_t.webp`}
            alt=""
            className="size-full rounded-xl object-cover"
          />
          <button
            type="button"
            aria-label={t("remove")}
            onClick={() => onChange(value.filter((v) => v !== id))}
            className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-foreground text-background"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {pending.map((p) => (
        <div key={p.key} className="relative aspect-square">
          {/* biome-ignore lint/performance/noImgElement: local blob preview */}
          <img
            src={p.preview}
            alt=""
            className="size-full rounded-xl object-cover opacity-50"
          />
          <Loader2 className="absolute inset-0 m-auto size-5 animate-spin" />
        </div>
      ))}
      {!full && (
        <label
          htmlFor={inputId}
          className={cn(
            "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[12px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground",
          )}
        >
          <ImagePlus className="size-5" />
          {t("add")}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
