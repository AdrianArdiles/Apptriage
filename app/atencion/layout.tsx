"use client";

import { AuthenticatedNav } from "@/components/authenticated-nav";

const BG_DARK = "#0f172a";

export default function AtencionLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
      <AuthenticatedNav />
      <main className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
