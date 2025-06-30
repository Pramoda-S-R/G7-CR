import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG CHATBOT",
  description: "Created by Pramoda S R",
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
