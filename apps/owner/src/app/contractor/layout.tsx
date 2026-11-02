import type { Metadata } from "next";
export const metadata: Metadata = { title: "Nnetics · Contractor demo", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function ContractorLayout({ children }: {
    children: React.ReactNode;
}) { return children; }
