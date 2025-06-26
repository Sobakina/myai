'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export type AssistantFormValues = {
  name: string;
  description: string;
  systemPrompt: string;
};


export function AssistantForm({ onSubmit }: { onSubmit: (data: AssistantFormValues) => void }) {
  const { register, handleSubmit, formState } = useForm<AssistantFormValues>();
  const router = useRouter();

  const handleFormSubmit = (data: AssistantFormValues) => {
    // Сохраняем данные ассистента в localStorage перед вызовом onSubmit
    localStorage.setItem('currentAssistant', JSON.stringify(data));
    onSubmit(data);
  };

  return (
    <form
      className="space-y-4 max-w-xl mx-auto bg-zinc-900/90 dark:bg-zinc-900/90 rounded-2xl shadow-xl p-8 mt-8"
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <h2 className="text-2xl font-bold mb-4 text-center text-zinc-400">Создание AI-ассистента</h2>
      <div>
        <label className="block font-semibold mb-1 text-zinc-400">Название ассистента</label>
        <input
          {...register("name", { required: true })}
          className="w-full p-2 rounded-xl border shadow text-zinc-400 placeholder-zinc-400"
          placeholder="Например: Юрист, Креативщик..."
        />
      </div>
      <div>
        <label className="block font-semibold mb-1 text-zinc-400">Описание</label>
        <input
          {...register("description", { required: true })}
          className="w-full p-2 rounded-xl border shadow text-zinc-400 placeholder-zinc-400"
          placeholder="Для чего этот ассистент?"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1 text-zinc-400">System Prompt</label>
        <textarea
          {...register("systemPrompt", { required: true })}
          className="w-full p-2 rounded-xl border shadow min-h-[60px] text-zinc-400 placeholder-zinc-400"
          placeholder="Как должен вести себя этот ассистент?"
        />
      </div>
      <button
        className="mt-4 w-full bg-black text-white font-bold py-2 rounded-xl shadow-xl hover:bg-gray-800 transition"
        type="submit"
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? "Создание..." : "Создать ассистента"}
      </button>
    </form>
  );
}
