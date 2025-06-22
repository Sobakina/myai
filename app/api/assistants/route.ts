import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Маппинг camelCase (от формы) в snake_case (для базы)
    const { name, description, systemPrompt, model } = body;
    const { data, error } = await supabase
      .from('assistants')
      .insert([
        {
          name,
          description,
          system_prompt: systemPrompt, // <--- ВАЖНО!
          model,
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
