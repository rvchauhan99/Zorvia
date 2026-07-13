import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gear, ChartLine, SignOut, ArrowRight, CreditCard } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

export default function More() {
  const { logout, session } = useAuth();
  const nav = useNavigate();
  const items = [
    { to: "/provider/reports", label: "Reports", icon: ChartLine, testid: "more-reports" },
    { to: "/provider/subscription", label: "Subscription", icon: CreditCard, testid: "more-subscription" },
    { to: "/provider/settings", label: "Settings", icon: Gear, testid: "more-settings" },
  ];
  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      <div>
        <span className="label-overline">Account · {session?.email}</span>
        <h1 className="font-display font-black text-3xl mt-1">More</h1>
      </div>
      <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
        {items.map((it) => (
          <li key={it.to}>
            <Link data-testid={it.testid} to={it.to} className="flex items-center gap-3 p-4 hover:bg-brand-surface transition-colors">
              <it.icon size={22} />
              <span className="font-medium">{it.label}</span>
              <ArrowRight size={16} className="ml-auto text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <button data-testid="more-logout" onClick={() => { logout(); nav("/login"); }} className="w-full flex items-center gap-3 p-4 hover:bg-brand-surface transition-colors text-left">
            <SignOut size={22} />
            <span className="font-medium">Sign out</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
