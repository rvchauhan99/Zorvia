import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, WEEKDAYS } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { SignOut } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

export default function ConsumerProfile() {
  const [me, setMe] = useState(null);
  const { logout } = useAuth();
  const nav = useNavigate();
  useEffect(() => { api.get("/consumer/me").then(({ data }) => setMe(data)); }, []);
  if (!me) return <div className="text-muted-foreground">Loading…</div>;
  const c = me.customer || {};
  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      <div>
        <span className="label-overline">Account</span>
        <h1 className="font-display font-black text-3xl mt-1">Profile</h1>
      </div>
      <div className="card-tinted p-5 flex flex-col gap-3">
        <div>
          <div className="label-overline">Name</div>
          <div className="font-medium">{c.name}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label-overline">Email</div>
            <div className="text-sm">{c.email || me.account.email}</div>
          </div>
          <div>
            <div className="label-overline">Phone</div>
            <div className="text-sm">{c.phone || "—"}</div>
          </div>
        </div>
        <div>
          <div className="label-overline">Address</div>
          <div className="text-sm">{c.address}{c.apartment ? `, ${c.apartment}` : ""}{c.postal_code ? ` · ${c.postal_code}` : ""}</div>
        </div>
        <div>
          <div className="label-overline">Delivery days</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {WEEKDAYS.map((d) => (
              <span key={d.i} className={`px-3 h-8 rounded-full text-xs font-medium inline-flex items-center ${
                (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
              }`}>{d.s}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label-overline">Meal price</div>
            <div className="font-medium">{fmtCAD(c.meal_price)}</div>
          </div>
          <div>
            <div className="label-overline">Provider</div>
            <div className="font-medium">{me.provider?.name}</div>
          </div>
        </div>
      </div>
      <button data-testid="profile-logout" onClick={() => { logout(); nav("/login"); }} className="pill-btn btn-outline gap-2 self-start">
        <SignOut size={16} /> Sign out
      </button>
    </div>
  );
}
