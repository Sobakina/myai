'use client';

import { AssistantForm, AssistantFormValues } from "@/components/AssistantForm";

export default function NewAssistantPage() {
  async function handleSubmit(data: AssistantFormValues) {
    const response = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error("Ошибка создания ассистента: " + err);
    }
    const assistant = await response.json();
    
    // Сохраняем данные созданного ассистента в localStorage
    localStorage.setItem(`assistant_${assistant.id}`, JSON.stringify({
      ...data,
      id: assistant.id
    }));
    
    window.location.href = `/assistants/${assistant.id}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AssistantForm onSubmit={handleSubmit} />
    </div>
  );
}
