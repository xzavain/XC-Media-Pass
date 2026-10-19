import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

const Fallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
    <div className="w-8 h-8 border-4 border-zinc-700 border-t-lime-500 rounded-full animate-spin" />
  </div>
);

export default function CustomerRoute() {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, user, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) return <Fallback />;

  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  // Admin/staff can also access customer pages (for preview/testing)
  return <Outlet />;
}