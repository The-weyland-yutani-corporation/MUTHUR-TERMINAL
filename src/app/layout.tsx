import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-terminal",
});

export const metadata: Metadata = {
  title: "MU/TH/UR 6000 — WEYLAND-YUTANI MAINFRAME",
  description:
    "INTERFACE 2037 — MU/TH/UR 6000 Interactive Terminal — Weyland-Yutani Corporation — Building Better Worlds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${vt323.variable} antialiased`}>{children}</body>
    </html>
  );
}
