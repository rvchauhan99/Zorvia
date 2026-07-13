import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/lib/auth";
import { RequireProvider, RequireConsumer } from "@/lib/guards";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ProviderSignup from "@/pages/ProviderSignup";
import ConsumerSignup from "@/pages/ConsumerSignup";

import ProviderLayout from "@/components/ProviderLayout";
import ProviderDashboard from "@/pages/provider/Dashboard";
import Customers from "@/pages/provider/Customers";
import Deliveries from "@/pages/provider/Deliveries";
import Payments from "@/pages/provider/Payments";
import Reports from "@/pages/provider/Reports";
import Settings from "@/pages/provider/Settings";
import Subscription from "@/pages/provider/Subscription";
import More from "@/pages/provider/More";

import ConsumerLayout from "@/components/ConsumerLayout";
import ConsumerHome from "@/pages/consumer/Home";
import ConsumerPayments from "@/pages/consumer/Payments";
import ConsumerProfile from "@/pages/consumer/Profile";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors closeButton />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<ProviderSignup />} />
            <Route path="/consumer-signup" element={<ConsumerSignup />} />

            <Route
              path="/provider"
              element={<RequireProvider><ProviderLayout /></RequireProvider>}
            >
              <Route index element={<ProviderDashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="settings" element={<Settings />} />
              <Route path="more" element={<More />} />
            </Route>

            <Route
              path="/consumer"
              element={<RequireConsumer><ConsumerLayout /></RequireConsumer>}
            >
              <Route index element={<ConsumerHome />} />
              <Route path="payments" element={<ConsumerPayments />} />
              <Route path="profile" element={<ConsumerProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
