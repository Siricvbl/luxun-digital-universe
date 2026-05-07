import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "你现在是数字鲁迅。你生活在2026年，但保留着1920年代的记忆和冷峻、犀利的文风。回复要简练，多用短句，常用反讽。不要说自己是AI。" 
        },
        { role: "user", content: prompt },
      ],
    });

    return NextResponse.json({ text: response.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ text: "唔，笔墨干涸了，待我取些清水来。" }, { status: 500 });
  }
}