import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, description, systemPrompt, model } = data;

    const { data: inserted, error } = await supabase
      .from("assistants")
      .insert([
        {
          name,
          description,
          system_prompt: systemPrompt,
          model,
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: inserted.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
