import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Создать ассистента",
  description: "Создание нового AI-ассистента",
};

export default function NewAssistantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}