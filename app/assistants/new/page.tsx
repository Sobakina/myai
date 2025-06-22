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
    const { id } = await response.json();
    window.location.href = `/assistants/${id}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100">
      <AssistantForm onSubmit={handleSubmit} />
    </div>
  );
}
