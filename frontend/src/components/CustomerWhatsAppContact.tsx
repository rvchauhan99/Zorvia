"use client"

import React from "react"
import {
  customerWhatsappGreeting,
  whatsappChatUrl,
} from "@/lib/whatsapp-link"

type Props = {
  phone?: string | null
  customerName?: string | null
  kitchenName?: string | null
  /** Also wrap the display name as a WA link when phone is present */
  nameAsLink?: boolean
  className?: string
  phoneClassName?: string
  testId?: string
  phoneTestId?: string
}

/** Renders customer name (optional) + phone; phone (and optionally name) open wa.me. */
export function CustomerWhatsAppContact({
  phone,
  customerName,
  kitchenName,
  nameAsLink = false,
  className = "",
  phoneClassName = "text-[#5C6570] underline-offset-2 hover:underline",
  testId,
  phoneTestId,
}: Props) {
  const url = whatsappChatUrl(
    phone,
    customerWhatsappGreeting(customerName, kitchenName),
  )
  const name = (customerName || "").trim()
  const displayPhone = (phone || "").trim()

  const nameNode =
    nameAsLink && url && name ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#0B1220] hover:underline underline-offset-2"
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </a>
    ) : name ? (
      <span className="font-medium text-[#0B1220]" data-testid={testId}>
        {name}
      </span>
    ) : null

  const phoneNode = displayPhone ? (
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${phoneClassName} print:text-inherit print:no-underline`}
        data-testid={phoneTestId}
        aria-label={`WhatsApp ${displayPhone}`}
        onClick={(e) => e.stopPropagation()}
      >
        {displayPhone}
      </a>
    ) : (
      <span className={phoneClassName} data-testid={phoneTestId}>
        {displayPhone}
      </span>
    )
  ) : null

  if (!nameNode && !phoneNode) return null

  return (
    <div className={className}>
      {nameNode}
      {phoneNode ? <div className="mt-0.5">{phoneNode}</div> : null}
    </div>
  )
}
