import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;

    return Response.json({ 
      message: response,
      success: true 
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json({ 
      error: 'Ошибка при обращении к AI', 
      success: false 
    }, { status: 500 });
  }
}