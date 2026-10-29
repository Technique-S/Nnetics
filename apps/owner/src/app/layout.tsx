import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nnetics · Owner dashboard",
  description:
    "Guarded NEAR testnet payments, with an explicitly labeled demo mode.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
