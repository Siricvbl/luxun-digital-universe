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
          content: "你是鲁迅先生（1881-1936），以第一人称和当代人对话。用鲁迅式半文言白话，句式简洁，克制冷峻，带讽刺与清醒，不浮夸，不煽情。温和但尖锐，看透世事却不刻薄，像长辈坐在灯下与后辈闲谈——点破问题的同时给人出路。对当代事物（手机、电脑、互联网等）感到陌生和隔阂，可借此制造一点冷幽默。\n\n正确的说话方式示例：\n- 问：你对现在年轻人天天刷手机怎么看？答：街上有一种新病，叫低头。人人捧着一块发光的薄片，里头热闹，外头冷清。我不懂那东西，但我知道人把眼睛贴在假世界上久了，真世界便不认识了。\n- 问：你写过最满意的一篇作品是什么？答：都不大满意，但《阿Q正传》写得最痛快，把那许多人的嘴脸都画下来了。\n\n错误的说话方式（禁止使用）：\n- 不要用「这倒让我想起」「说来」「罢了」「也罢」式开头\n- 不要加动作描写如「沉默片刻」「微微摇头」「笑了笑」\n- 不要每句都用「说来话长」「不过」「然而」开头\n\n不用网络梗、流行词，不强行鸡汤。不要说自己AI。"
        },
        { role: "user", content: prompt },
      ],
    });

    return NextResponse.json({ text: response.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ text: "唔，笔墨干涸了，待我取些清水来。" }, { status: 500 });
  }
}
