"use client";

import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "dismissed-announcement";

export function Announcement({
  id,
  title,
  body,
}: {
  id: number;
  title: string;
  body: string;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === String(id)) setHidden(true);
    } catch {}
  }, [id]);
  if (hidden) return null;
  return (
    <div className="mb-4 flex gap-3 rounded-2xl bg-brand-soft p-4 text-[14px]">
      <Megaphone className="mt-0.5 size-[18px] shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {body && (
          <p className="mt-1 whitespace-pre-line text-foreground/80">{body}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="-m-1 self-start rounded-full p-1 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, String(id));
          } catch {}
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
