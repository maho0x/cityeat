"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const desktop = useMediaQuery("(min-width: 768px)");
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="px-6 pt-4 pb-6">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-[20px]">
        <DrawerHeader className="px-5 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="pb-safe overflow-y-auto px-5 pt-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
