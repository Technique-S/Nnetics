import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nnetics · Owner simulation",
  description:
    "Local owner dashboard with synthetic data. No wallet or deployment.",
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
