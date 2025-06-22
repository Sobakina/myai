import React from "react";
import { useForm } from "react-hook-form";

export type AssistantFormValues = {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
};

const models = [
  { label: "GPT-4o (gpt-4o)", value: "gpt-4o" },
  { label: "GPT-4.1 (gpt-4-1106-preview)", value: "gpt-4-1106-preview" },
  { label: "GPT-4o mini (gpt-4o-mini)", value: "gpt-4o-mini" },
  { label: "GPT-3.5 Turbo (gpt-3.5-turbo)", value: "gpt-3.5-turbo" },
];

export function AssistantForm({ onSubmit }: { onSubmit: (data: AssistantFormValues) => void }) {
  const { register, handleSubmit, formState } = useForm<AssistantFormValues>();

  return (
    <form
      className="space-y-4 max-w-xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8 mt-8"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-2xl font-bold mb-4 text-center">Создание AI-ассистента</h2>
      <div>
        <label className="block font-semibold mb-1">Название ассистента</label>
        <input
          {...register("name", { required: true })}
          className="w-full p-2 rounded-xl border shadow"
          placeholder="Например: Юрист, Креативщик..."
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Описание</label>
        <input
          {...register("description", { required: true })}
          className="w-full p-2 rounded-xl border shadow"
          placeholder="Для чего этот ассистент?"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">System Prompt</label>
        <textarea
          {...register("systemPrompt", { required: true })}
          className="w-full p-2 rounded-xl border shadow min-h-[60px]"
          placeholder="Как должен вести себя этот ассистент?"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Модель</label>
        <select
          {...register("model", { required: true })}
          className="w-full p-2 rounded-xl border shadow"
        >
          {models.map((m) => (
            <option value={m.value} key={m.value}>
              {m.label}
            </option>
          ))}
        </select>
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
