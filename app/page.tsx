import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Главная страница",
  description: "Добро пожаловать на главную страницу AI-ассистентов",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Главная</h1>
        <p className="text-lg text-zinc-400 mb-8">
          Добро пожаловать на главную страницу AI-ассистентов
        </p>
        <Link 
          href="/assistants/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Создать нового ассистента
        </Link>
      </div>
    </div>
  );
}
