"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { setManagerSession, hasManagerSession } from "@/lib/manager-session";

const MANAGER_EMAILS =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_MANAGER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) || [];

/** Observer de autenticación: redirige a Panel de Gestión si está logueado, o a Login si no. La app recuerda la sesión (Firebase persistence). */
export function AuthObserver(): null {
  const { user, profile, authorizedUser, loading, isUnauthorized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // Ya logueado y autorizado en / o /login → ir a Nueva Atención por defecto
  useEffect(() => {
    if (loading || !user || !profile || !authorizedUser) return;
    if (isUnauthorized) return;
    const isLoginRoute = pathname === "/" || pathname === "/login";
    if (!isLoginRoute) return;
    if (hasRedirected.current) return;

    hasRedirected.current = true;
    const rol = authorizedUser.rol;
    const isManagerEmail = MANAGER_EMAILS.length > 0 && (user.email ?? "").trim().toLowerCase() && MANAGER_EMAILS.includes((user.email ?? "").trim().toLowerCase());
    const hasManager = hasManagerSession() || isManagerEmail || rol === "ADMIN" || rol === "DOCTOR";
    if (hasManager) setManagerSession();
    router.replace("/atencion");
  }, [loading, user, profile, authorizedUser, isUnauthorized, pathname, router]);

  // No logueado en ruta protegida → Login
  useEffect(() => {
    if (loading) return;
    if (user) return;
    const protectedPaths = ["/manager", "/atencion", "/historial", "/dashboard"];
    const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (isProtected) router.replace("/login");
  }, [loading, user, pathname, router]);

  return null;
}
