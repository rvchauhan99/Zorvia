import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function RequireProvider({ children }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (session.user_type !== "provider") return <Navigate to="/consumer" replace />;
  return children;
}

export function RequireConsumer({ children }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (session.user_type !== "consumer") return <Navigate to="/provider" replace />;
  return children;
}
