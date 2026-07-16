"use client";

import React, { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const inputCls =
  "h-12 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow w-full";

export function ContactForm() {
  const [contact, setContact] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function onContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.name.trim() || !contact.email.trim() || !contact.message.trim()) {
      toast.error("Name, email, and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/public/contact", {
        name: contact.name.trim(),
        email: contact.email.trim(),
        subject: contact.subject.trim() || undefined,
        message: contact.message.trim(),
        company: contact.company,
      });
      toast.success("Message sent — we'll get back to you soon.");
      setContact({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not send. Please email us directly.";
      toast.error(typeof detail === "string" ? detail : "Could not send. Please email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onContactSubmit}
      data-testid="contact-form"
      className="lg:col-span-7 card-tinted p-7 sm:p-9 lg:p-10 flex flex-col gap-4"
    >
      <input
        type="text"
        name="company"
        value={contact.company}
        onChange={(e) => setContact({ ...contact, company: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            data-testid="contact-name"
            required
            className={inputCls}
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            data-testid="contact-email"
            required
            type="email"
            className={inputCls}
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Subject <span className="text-muted-foreground font-normal">(optional)</span>
        </span>
        <input
          data-testid="contact-subject"
          className={inputCls}
          value={contact.subject}
          onChange={(e) => setContact({ ...contact, subject: e.target.value })}
          placeholder="How can we help?"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Message</span>
        <textarea
          data-testid="contact-message"
          required
          rows={5}
          maxLength={2000}
          className={`${inputCls} h-auto py-3 resize-y min-h-[140px]`}
          value={contact.message}
          onChange={(e) => setContact({ ...contact, message: e.target.value })}
          placeholder="Tell us a bit about your kitchen or question…"
        />
      </label>
      <button
        type="submit"
        data-testid="contact-submit"
        disabled={submitting}
        className="pill-btn btn-primary self-start h-12 px-7 text-base gap-2 disabled:opacity-60 cursor-pointer mt-1"
      >
        {submitting ? "Sending…" : "Send message"}
        {!submitting && <ArrowRight size={18} weight="bold" />}
      </button>
    </form>
  );
}
