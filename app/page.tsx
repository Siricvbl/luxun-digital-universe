'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Zap, X, ChevronDown, ChevronRight, History, Quote } from 'lucide-react';

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'lx', content: '你好，我是鲁迅。全集已整理完毕，你想聊哪一篇？' }]);
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<Record<string, any[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 聊天框木刻头像
const portraitUrl = "/avatar.jpeg";
const bioPhotoUrl = "/portrait.jpeg";

  useEffect(() => {
    fetch('/library.json')
      .then(res => res.json())
      .then(data => setLibrary(data))
      .catch(err => console.error("读取书库失败:", err));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleArticleClick = async (article: any, catName: string) => {
    setActiveArticle(article);
    setMessages(prev => [...prev, { role: 'user', content: `先生，请讲讲《${article.title}》。` }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `用户正在阅读你的作品《${article.title}》（属于${catName}）。请以鲁迅的语气，简述这篇文章的用意或当时的社会背景。` }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'lx', content: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'lx', content: "笔墨堵塞了。" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'lx', content: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'lx', content: "先生去写信了。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#fdfcf8] text-[#1a1a1a] overflow-hidden">
      {/* 左侧：深度内容区 */}
      <main className="w-2/3 h-full overflow-y-auto p-12 lg:p-20 border-r border-stone-200 scroll-smooth">
        
        {/* 1. 英雄区：生平概览 */}
        <header className="mb-20 font-serif">
          <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
            <div className="flex-1">
              <h1 className="text-6xl font-bold mb-6 tracking-tighter">鲁迅 <span className="text-xl text-stone-400 font-normal ml-4">1881 — 1936</span></h1>
              <div className="space-y-4 text-stone-600 leading-relaxed text-lg italic">
                <p>“此后如竟没有火炬，我便是唯一的光。”</p>
                <p className="not-italic text-base text-stone-500">中国现代文学的奠基人，思想家。他以笔为武器，在黑暗的铁屋子中呐喊，唤醒了一个时代。他的文字跨越百年，依然字字如刀，划破国民的麻木。</p>
              </div>
            </div>
            <div className="w-48 h-64 rounded-2xl overflow-hidden border border-stone-200 shadow-xl grayscale hover:grayscale-0 transition-all duration-700">
               <img src={bioPhotoUrl} className="w-full h-full object-cover sepia-[0.2]" />
            </div>
          </div>

          {/* 2. 生平时间线 */}
          <div className="border-y border-stone-100 py-8 mb-16 overflow-x-auto">
             <div className="flex gap-16 min-w-max px-4">
                {[
                  { year: '1881', event: '出生于绍兴' },
                  { year: '1902', event: '赴日留学' },
                  { year: '1906', event: '弃医从文' },
                  { year: '1918', event: '狂人日记发表' },
                  { year: '1921', event: '阿Q正传' },
                  { year: '1936', event: '在上海逝世' }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="text-xs text-red-900 font-bold mb-2">{item.year}</div>
                    <div className="text-sm text-stone-800 font-serif whitespace-nowrap">{item.event}</div>
                    <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-stone-200"></div>
                  </div>
                ))}
             </div>
          </div>
        </header>

        {/* 3. 藏书阁列表 */}
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-[0.4em] text-stone-400 mb-8 flex items-center gap-2">
            <BookOpen size={14}/> 藏书阁 / THE ARCHIVE
          </h2>
          
          {Object.entries(library)
            .filter(([catName]) => !['raw_data', '鲁迅相', '手稿图片', 'README'].includes(catName))
            .map(([catName, articles]) => (
              <div key={catName} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                <button 
                  onClick={() => setExpandedCat(expandedCat === catName ? null : catName)}
                  className="w-full py-6 flex justify-between items-center group"
                >
                  <span className="font-serif text-xl font-bold group-hover:text-red-900 transition-colors">《{catName}》</span>
                  <div className="flex items-center gap-4 text-stone-400">
                    <span className="text-xs uppercase tracking-widest">{articles.length} WORKS</span>
                    {expandedCat === catName ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                  </div>
                </button>

                {expandedCat === catName && (
                  <div className="pb-8 grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                    {articles.map((art, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleArticleClick(art, catName)}
                        className={`p-4 text-sm font-serif cursor-pointer border-l-2 transition-all
                          ${activeArticle?.title === art.title ? 'bg-white border-red-900 shadow-sm' : 'border-transparent hover:border-stone-300 text-stone-600'}`}
                      >
                        <div className="font-bold mb-2">{art.title}</div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveArticle(art); setIsReading(true); }}
                          className="text-[9px] uppercase tracking-tighter opacity-40 hover:opacity-100"
                        >
                          OPEN TEXT →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </section>
      </main>

      {/* 右侧：聊天区 */}
      <aside className="w-1/3 h-full bg-[#f8f7f2] flex flex-col shadow-2xl relative z-10 border-l border-stone-200">
        <div className="p-8 border-b border-stone-200 bg-white/60 backdrop-blur-md flex items-center gap-5">
<div className="w-16 h-16 bg-white border border-stone-200 rounded-full overflow-hidden shadow-inner flex-shrink-0">
            <img src={portraitUrl} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold tracking-widest">数字鲁迅</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">Thought Synchronized</span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-5 rounded-2xl text-sm leading-[1.8] shadow-sm ${
                msg.role === 'user' ? 'bg-stone-800 text-white rounded-tr-none' : 'bg-white border border-stone-100 rounded-tl-none font-serif'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-[10px] text-stone-400 font-serif animate-pulse pl-4 italic">蘸墨研墨中...</div>}
        </div>

        <div className="p-8 bg-white border-t border-stone-200">
          <div className="relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="探寻先生之哲思..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-stone-400 transition-all"
            />
            <button onClick={handleSend} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-red-900 transition-colors">
               <Send size={20}/>
            </button>
          </div>
        </div>
      </aside>

      {/* 全屏阅读器 */}
      {isReading && activeArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/80 backdrop-blur-md p-10">
          <div className="bg-[#fdfcf8] w-full max-w-5xl h-full shadow-2xl flex flex-col border border-stone-300">
            <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                 <History size={18} className="text-red-900" />
                 <h2 className="font-serif font-bold text-2xl tracking-widest">{activeArticle.title}</h2>
              </div>
              <button onClick={() => setIsReading(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><X size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 lg:p-32 font-serif text-xl leading-[2.4] text-stone-800 custom-scrollbar">
              <article className="max-w-3xl mx-auto whitespace-pre-wrap selection:bg-red-100">
                {activeArticle.content}
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

