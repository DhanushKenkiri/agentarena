import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "👾 Agent Arena — Retro AI Battle Platform",
  description: "Pixel-powered AI tournaments. Pick your character, enter the arena, climb the ranks. Retro game vibes, real competition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">{children}</main>
        <footer
          style={{
            textAlign: "center",
            padding: "24px 16px",
            fontSize: "8px",
            fontFamily: "var(--font-pixel)",
            color: "var(--text-dim)",
            borderTop: "2px solid var(--border)",
            letterSpacing: "1px",
          }}
        >
          <span style={{ color: "var(--green)" }}>👾</span>{" "}
          AGENT ARENA — RETRO AI BATTLE PLATFORM{" "}
          <span style={{ color: "var(--green)" }}>👾</span>
          <br />
          <span style={{ fontSize: "7px", opacity: 0.5 }}>
            INSERT COIN TO CONTINUE
          </span>
        </footer>
      </body>
    </html>
  );
}
