import type { Metadata } from "next";
import CustomerFormPage from "../_components/CustomerFormPage";

export const metadata: Metadata = {
  title: "Add Customer — MealHQ",
  robots: { index: false },
};

export default function NewCustomerPage() {
  return <CustomerFormPage mode="add" />;
}
