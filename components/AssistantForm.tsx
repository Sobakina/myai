'use client';

import React, { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";

export type AssistantFormValues = {
  name: string;
  description: string;
  systemPrompt?: string;
};


export function AssistantForm({ onSubmit }: { onSubmit: (data: AssistantFormValues) => void }) {
  const { register, handleSubmit, formState, watch } = useForm<AssistantFormValues>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Следим за изменениями в поле systemPrompt
  const systemPromptValue = watch('systemPrompt');

  const handleFormSubmit = async (data: AssistantFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error creating assistant:', error);
    }
  };

  // Функция для автоматического изменения размера textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
  };

  // Эффект для изменения размера при изменении содержимого
  useEffect(() => {
    if (textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [systemPromptValue]);

  // Эффект для установки начальной высоты с учетом placeholder
  useEffect(() => {
    if (textareaRef.current) {
      // Временно устанавливаем placeholder как value для расчета высоты
      const originalValue = textareaRef.current.value;
      const placeholder = textareaRef.current.placeholder;
      
      if (!originalValue && placeholder) {
        textareaRef.current.value = placeholder;
        autoResize(textareaRef.current);
        textareaRef.current.value = originalValue;
      } else {
        autoResize(textareaRef.current);
      }
    }
  }, []);

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
        <label className="block font-semibold mb-1 text-zinc-400">System Prompt (необязательно)</label>
        <textarea
          {...register("systemPrompt")}
          ref={textareaRef}
          className="w-full p-2 rounded-xl border shadow min-h-[60px] text-zinc-400 placeholder-zinc-400 resize-none overflow-hidden"
          placeholder="Как должен вести себя этот ассистент? (оставьте пустым для стандартного поведения)"
          onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
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
