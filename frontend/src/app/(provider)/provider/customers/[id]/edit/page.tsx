"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import CustomerFormPage from "../../_components/CustomerFormPage";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/customers/${id}`)
      .then(({ data }) => {
        setCustomer(data);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error("Failed to load customer");
          router.push("/provider/customers");
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
        <p className="font-display font-bold text-xl">Customer not found</p>
        <p className="text-sm text-muted-foreground">
          This customer may have been deleted or the link is incorrect.
        </p>
        <button
          type="button"
          onClick={() => router.push("/provider/customers")}
          className="pill-btn btn-primary mt-2 cursor-pointer"
        >
          Back to customers
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Sticky bar skeleton */}
        <div className="h-14 bg-brand-surface rounded-xl" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-brand-border rounded-2xl h-48" />
        ))}
      </div>
    );
  }

  return (
    <CustomerFormPage mode="edit" customerId={id} initialData={customer} />
  );
}
