"use client";

import React, { useMemo } from "react";
import { CA_PROVINCES } from "@/lib/ca-provinces";
import { citySelectOptions } from "@/lib/ca-cities";
import SearchableSelect from "@/components/SearchableSelect";

export type CaAddressValues = {
  province: string;
  city: string;
  postal_code: string;
  address: string;
  apartment: string;
};

export type CaAddressErrors = Partial<
  Record<"province" | "city" | "postal_code" | "address" | "apartment", string>
>;

type Props = {
  values: CaAddressValues;
  onChange: (patch: Partial<CaAddressValues>) => void;
  errors?: CaAddressErrors;
  inputClassName: string;
  errorClassName?: string;
  testidPrefix: string;
  /** When true, show * on required labels (province, city, postal, street). */
  showRequiredMarks?: boolean;
  streetRequired?: boolean;
  cityRequired?: boolean;
  provinceRequired?: boolean;
  postalRequired?: boolean;
};

function fieldClass(
  inputClassName: string,
  errorClassName: string | undefined,
  hasError: boolean,
): string {
  if (hasError && errorClassName) return errorClassName;
  return inputClassName;
}

/** Module-scoped so inputs are not remounted on every parent keystroke. */
function Label({
  label,
  required,
  showRequiredMarks,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  showRequiredMarks?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className || ""}`}>
      <span className="label-overline">
        {label}
        {showRequiredMarks && required ? <span className="text-destructive ml-0.5">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

/**
 * Canadian address fields in order:
 * Province → City → Postal → Street → Apartment.
 * City options are filtered by the selected province.
 */
export default function CaAddressFields({
  values,
  onChange,
  errors = {},
  inputClassName,
  errorClassName,
  testidPrefix,
  showRequiredMarks = false,
  streetRequired = true,
  cityRequired = true,
  provinceRequired = true,
  postalRequired = true,
}: Props) {
  const province = values.province || "ON";
  const cities = citySelectOptions(province, values.city);
  const cityValue =
    cities.find((c) => c.toLowerCase() === (values.city || "").trim().toLowerCase()) ||
    values.city ||
    "";

  const provinceOptions = useMemo(
    () => CA_PROVINCES.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` })),
    [],
  );

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c, label: c })),
    [cities],
  );

  function setProvince(next: string) {
    const code = next || "ON";
    const match = citySelectOptions(code, "").find(
      (c) => c.toLowerCase() === (values.city || "").trim().toLowerCase(),
    );
    onChange({
      province: code,
      city: match || "",
    });
  }

  return (
    <>
      <Label
        label="Province / territory"
        required={provinceRequired}
        showRequiredMarks={showRequiredMarks}
        error={errors.province}
      >
        <SearchableSelect
          testid={`${testidPrefix}-province`}
          value={province}
          onChange={setProvince}
          options={provinceOptions}
          placeholder="Search province…"
          inputClassName={fieldClass(inputClassName, errorClassName, !!errors.province)}
          errorClassName={errorClassName}
          hasError={!!errors.province}
        />
      </Label>

      <Label
        label="City"
        required={cityRequired}
        showRequiredMarks={showRequiredMarks}
        error={errors.city}
      >
        <SearchableSelect
          testid={`${testidPrefix}-city`}
          value={cityValue}
          onChange={(v) => onChange({ city: v })}
          options={cityOptions}
          allowEmpty={!cityRequired}
          emptyLabel="Select city"
          placeholder="Search city…"
          inputClassName={fieldClass(inputClassName, errorClassName, !!errors.city)}
          errorClassName={errorClassName}
          hasError={!!errors.city}
        />
      </Label>

      <Label
        label="Postal code"
        required={postalRequired}
        showRequiredMarks={showRequiredMarks}
        error={errors.postal_code}
      >
        <input
          required={postalRequired}
          data-testid={`${testidPrefix}-postal`}
          value={values.postal_code || ""}
          onChange={(e) => onChange({ postal_code: e.target.value.toUpperCase() })}
          className={`${fieldClass(inputClassName, errorClassName, !!errors.postal_code)} uppercase`}
          placeholder="M5H 2M9"
          autoComplete="postal-code"
        />
      </Label>

      <Label
        label="Street address"
        required={streetRequired}
        showRequiredMarks={showRequiredMarks}
        error={errors.address}
        className="sm:col-span-2"
      >
        <input
          required={streetRequired}
          data-testid={`${testidPrefix}-address`}
          value={values.address || ""}
          onChange={(e) => onChange({ address: e.target.value })}
          className={fieldClass(inputClassName, errorClassName, !!errors.address)}
          placeholder="123 Main St W"
          autoComplete="street-address"
        />
      </Label>

      <Label label="Apartment / unit" error={errors.apartment}>
        <input
          data-testid={`${testidPrefix}-apt`}
          value={values.apartment || ""}
          onChange={(e) => onChange({ apartment: e.target.value })}
          className={fieldClass(inputClassName, errorClassName, !!errors.apartment)}
          placeholder="Unit 4B"
          autoComplete="address-line2"
        />
      </Label>
    </>
  );
}
