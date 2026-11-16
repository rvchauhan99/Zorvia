/** Build wa.me chat URLs. Keep phoneKey for CRM dedup; use whatsappDigits for wa.me. */

/** CRM-style 10-digit key (strips leading NANP 1) — for match/dedup only, not wa.me. */
export function phoneKey(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  if (digits.length > 10) return digits.slice(-10)
  return digits
}

/**
 * Full international digits for wa.me (mirrors API whatsapp_digits).
 * 10 digits → prepend Canada/US 1; 11–15 kept; 00-prefix stripped.
 */
export function whatsappDigits(phone: string | null | undefined): string {
  let digits = String(phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.length > 11) digits = digits.replace(/^0+/, "") || digits
  if (digits.length === 10) return `1${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return ""
}

export function whatsappChatUrl(
  phone: string | null | undefined,
  text?: string | null,
): string | null {
  const digits = whatsappDigits(phone)
  if (!digits) return null
  let url = `https://wa.me/${digits}`
  const msg = (text || "").trim()
  if (msg) url += `?text=${encodeURIComponent(msg)}`
  return url
}

export function customerWhatsappGreeting(
  customerName?: string | null,
  kitchenName?: string | null,
): string {
  const name = (customerName || "").trim() || "there"
  const kitchen = (kitchenName || "").trim()
  if (kitchen) return `Hi ${name}, this is ${kitchen} regarding your delivery.`
  return `Hi ${name}, regarding your delivery.`
}

export function driverRoutePdfGreeting(mealSlot: string, planningDate: string): string {
  const slot = (mealSlot || "dinner").trim().toLowerCase() || "dinner"
  const day = (planningDate || "").trim()
  return `Your route PDF for ${slot} ${day} was downloaded — please attach it here.`
}
