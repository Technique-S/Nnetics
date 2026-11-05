import localFont from "next/font/local";

export const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-jakarta",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
