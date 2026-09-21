"use client"

import type { InputHTMLAttributes, FocusEvent } from "react"

export type NumericInputMode = "integer" | "decimal"

export type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string
  onValueChange: (next: string) => void
  /** integer = whole numbers; decimal = money-like with one `.` */
  mode?: NumericInputMode
  allowNegative?: boolean
  /** When blur is empty/invalid, write this string via onValueChange (if set). */
  emptyFallback?: string
  /** Clamp on blur when the parsed value is finite. */
  min?: number
  max?: number
  /** After blur normalize (and optional clamp), notify with the committed string. */
  onBlurCommit?: (committed: string) => void
  "data-testid"?: string
}

const filterInteger = (raw: string, allowNegative: boolean): string => {
  let out = ""
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch >= "0" && ch <= "9") {
      out += ch
      continue
    }
    if (allowNegative && ch === "-" && out.length === 0) {
      out += ch
    }
  }
  return out
}

const filterDecimal = (raw: string, allowNegative: boolean): string => {
  let out = ""
  let seenDot = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch >= "0" && ch <= "9") {
      out += ch
      continue
    }
    if (allowNegative && ch === "-" && out.length === 0) {
      out += ch
      continue
    }
    if (ch === "." && !seenDot) {
      seenDot = true
      out += ch
    }
  }
  return out
}

const parseForClamp = (raw: string, mode: NumericInputMode): number | null => {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") return null
  const n = mode === "integer" ? Number.parseInt(trimmed, 10) : Number.parseFloat(trimmed)
  if (!Number.isFinite(n)) return null
  return n
}

const formatCommitted = (n: number, mode: NumericInputMode): string => {
  if (mode === "integer") return String(Math.trunc(n))
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

/**
 * Mobile-friendly numeric field: text + inputMode, no spinner arrows,
 * clearable while typing. Optional blur clamp via min/max/emptyFallback.
 */
export const NumericInput = ({
  value,
  onValueChange,
  mode = "integer",
  allowNegative = false,
  emptyFallback,
  min,
  max,
  onBlurCommit,
  onBlur,
  "data-testid": dataTestId,
  ...rest
}: NumericInputProps) => {
  const handleChange = (raw: string) => {
    const next = mode === "integer" ? filterInteger(raw, allowNegative) : filterDecimal(raw, allowNegative)
    onValueChange(next)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    let next = value
    const parsed = parseForClamp(value, mode)

    if (parsed === null) {
      if (emptyFallback !== undefined) {
        next = emptyFallback
        if (next !== value) onValueChange(next)
      }
    } else {
      let n = parsed
      if (typeof min === "number") n = Math.max(min, n)
      if (typeof max === "number") n = Math.min(max, n)
      next = formatCommitted(n, mode)
      if (next !== value) onValueChange(next)
    }

    onBlurCommit?.(next)
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={mode === "decimal" ? "decimal" : "numeric"}
      autoComplete="off"
      data-testid={dataTestId}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  )
}
