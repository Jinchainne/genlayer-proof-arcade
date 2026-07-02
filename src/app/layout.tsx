import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenLayer Proof Arcade",
  description: "A dark Web3 arcade dashboard for fast prediction and AI-judged rounds on GenLayer."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
