import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const body = await req.json();
  // Убедимся, что все нужные поля есть:
  const { name, description, systemPrompt, model } = body;
  if (!name || !model) {
    return NextResponse.json({ error: "Name and model are required" }, { status: 400 });
  }

  // Вставляем ассистента через Supabase SDK (без ручных JWT и заголовков)
  const { data, error } = await supabase
    .from("assistants")
    .insert([
      {
        name,
        description,
        system_prompt: systemPrompt,
        model,
      },
    ])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.[0]?.id }, { status: 201 });
}
