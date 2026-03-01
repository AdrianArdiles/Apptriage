import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Ficha Clínica Digital | Ambulancias",
  description: "Ficha clínica digital para paramédicos: XABCDE, Glasgow, signos vitales, timestamps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
