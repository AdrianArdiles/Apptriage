"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirige al login real (pantalla de inicio en /). */
export default function LoginPage(): null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
