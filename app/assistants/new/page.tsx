import React from "react";
import { AssistantForm, AssistantFormValues } from "@/components/AssistantForm";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export default function NewAssistantPage() {
  async function handleSubmit(data: AssistantFormValues) {
    "use server"; // Используем server action (App Router)
    const userId = null; // TODO: подставить userId, если будет авторизация
    const { data: inserted, error } = await supabase
      .from("assistants")
      .insert([
        {
          name: data.name,
          description: data.description,
          system_prompt: data.systemPrompt,
          model: data.model,
          owner_id: userId,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    redirect(`/assistants/${inserted.id}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100">
      <AssistantForm onSubmit={handleSubmit} />
    </div>
  );
}
