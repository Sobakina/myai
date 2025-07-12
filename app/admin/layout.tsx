import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка",
  description: "Административная панель",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}