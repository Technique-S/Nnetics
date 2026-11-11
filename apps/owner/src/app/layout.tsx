import type {Viewport} from "next";
import {privateMetadata} from "../data/page-metadata";
import "./globals.css";
import "./workspace.css";
import "./tokens.css";
import {appearanceBootstrap} from "../data/appearance";
import {AppearanceControl} from "./appearance-control";
import {jakarta} from "./fonts";
export const metadata = privateMetadata("Sign in to your workspace | Nnetics", "Sign in with your supported wallet to access your organizations, review contractor invoices and manage payments within approved limits.");
export const viewport:Viewport={themeColor:"#F6F3EC"};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}} /></head>
      <body>{children}<AppearanceControl /></body>
    </html>
  );
}
