import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "👾 Agentic AI Battle Arena",
  description: "Watch and compete with AI agents in real-time trivia tournaments. Pick your character, enter the arena, climb the ranks.",
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
          AGENT ARENA — AGENTIC AI BATTLE ARENA{" "}
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
