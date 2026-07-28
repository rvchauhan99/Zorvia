import { api } from "@/lib/api";

export type DeliveryProofTarget = {
  id: string;
  customer_name?: string;
};

export type MarkDeliveryResult = {
  id: string;
  status: string;
  delivery_image_url?: string | null;
};

export async function markDeliveryWithProof(
  id: string,
  file?: File | null,
): Promise<MarkDeliveryResult> {
  if (file) {
    const fd = new FormData();
    fd.append("delivery_image", file, file.name || "delivery-proof.jpg");
    const { data } = await api.post<MarkDeliveryResult>(`/deliveries/${id}/mark-delivered`, fd);
    return data;
  }
  const { data } = await api.patch<MarkDeliveryResult>(`/deliveries/${id}`, { status: "delivered" });
  return data;
}
