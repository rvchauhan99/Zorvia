"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import AppSheet from "@/components/AppSheet";
import ImageSourceField from "@/components/ImageSourceField";
import { type DeliveryProofTarget } from "@/lib/deliveries";

type Props = {
  open: boolean;
  onClose: () => void;
  delivery: DeliveryProofTarget | null;
  onMark: (deliveryId: string, file: File | null) => Promise<void>;
};

export default function MarkDeliveredSheet({ open, onClose, delivery, onMark }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setSubmitting(false);
  }, [open, delivery?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!delivery?.id) return;
    if (file && !navigator.onLine) {
      toast.error("Photo requires an internet connection");
      return;
    }
    setSubmitting(true);
    try {
      await onMark(delivery.id, file);
      onClose();
    } catch {
      /* parent handles toast/errors */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppSheet
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Mark delivered"
      size="md"
      as="form"
      onSubmit={submit}
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="pill-btn btn-outline flex-1 h-11 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            data-testid="mark-delivered-confirm"
            type="submit"
            disabled={submitting}
            className="pill-btn btn-secondary flex-1 h-11 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Mark delivered"}
          </button>
        </div>
      )}
    >
      {delivery ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Confirm delivery for{" "}
            <span className="font-semibold text-foreground">{delivery.customer_name || "this stop"}</span>.
            You can optionally add a proof photo.
          </p>
          <ImageSourceField
            label="Delivery photo"
            optional
            value={file}
            onChange={setFile}
            disabled={submitting}
            testid="delivery-proof"
            emptyHint="Camera or gallery — optional"
          />
        </>
      ) : null}
    </AppSheet>
  );
}
