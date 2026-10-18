import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
