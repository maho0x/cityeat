"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSubmission } from "@/actions/content";
import {
  Field,
  PrimaryButton,
  Segmented,
  TextArea,
  TextInput,
} from "@/components/forms/fields";
import { ImagePicker } from "@/components/forms/image-picker";
import { useActionError } from "@/components/forms/use-action-error";
import { useRequireSignIn } from "./viewer-context";

export function NewRestaurantForm({
  areas,
}: {
  areas: { id: number; name: string }[];
}) {
  const t = useTranslations("newForm");
  const router = useRouter();
  const requireSignIn = useRequireSignIn();
  const onError = useActionError();
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState(String(areas[0]?.id ?? ""));
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="mx-auto max-w-xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!requireSignIn()) return;
        start(async () => {
          const res = await createSubmission({
            type: "new_restaurant",
            images,
            payload: {
              name,
              areaId: Number(areaId),
              location,
              hours,
              price,
              note,
            },
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("done"));
          router.push("/me");
        });
      }}
    >
      <div>
        <h1 className="text-[30px] leading-tight font-black tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{t("hint")}</p>
      </div>
      <Field label={t("name")}>
        {(id) => (
          <TextInput
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        )}
      </Field>
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold">{t("area")}</p>
        <Segmented
          value={areaId}
          onChange={setAreaId}
          options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
        />
      </div>
      <Field label={t("location")}>
        {(id) => (
          <TextInput
            id={id}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("locationPlaceholder")}
            required
            maxLength={200}
          />
        )}
      </Field>
      <Field label={t("hours")}>
        {(id) => (
          <TextInput
            id={id}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder={t("hoursPlaceholder")}
            maxLength={300}
          />
        )}
      </Field>
      <Field label={t("price")}>
        {(id) => (
          <TextInput
            id={id}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("pricePlaceholder")}
            maxLength={50}
          />
        )}
      </Field>
      <Field label={t("note")}>
        {(id) => (
          <TextArea
            id={id}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        )}
      </Field>
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold">{t("photos")}</p>
        <ImagePicker
          value={images}
          onChange={setImages}
          max={3}
          onBusyChange={setUploading}
        />
      </div>
      <PrimaryButton
        pending={pending}
        disabled={uploading || !name.trim() || !location.trim()}
      >
        {t("submit")}
      </PrimaryButton>
    </form>
  );
}
