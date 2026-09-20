/** Build wa.me chat URLs (CRM-style phone_key digits). */

export function phoneKey(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  if (digits.length > 10) return digits.slice(-10)
  return digits
}

export function whatsappChatUrl(
  phone: string | null | undefined,
  text?: string | null,
): string | null {
  const digits = phoneKey(phone)
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
