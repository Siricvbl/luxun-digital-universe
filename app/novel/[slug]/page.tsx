'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, MessageCircle, X, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Google Fonts: ZCOOL QingKe HuangYou
const fontLink = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap';

// --- 类型 ---
interface V7Character { id: string; cat: 'character'; desc: string; tags: string[]; role: string; quotes: string[]; }
interface V7Link { source: string; target: string; type: string; }
interface V7Event { id: string; cat?: string; name: string; desc: string; interpretation: string; chars: string[]; }
interface V7GraphData { schema: any; characters: V7Character[]; links: V7Link[]; events: V7Event[]; relationTypes: Record<string, string>; relationColors: Record<string, string>; }

const relColors: Record<string, string> = {
  '亲属': '#8B5CF6', '街坊': '#60A5FA', '医患': '#34D399',
  '主雇': '#FB923C', '路人': '#D1D5DB', '同乡': '#EAB308',
};

// --- 侧栏人物详情 ---
const EntityDetail: React.FC<{
  entity: any; links: V7Link[]; events: V7Event[];
  onClose: () => void; onChat: () => void; onJumpToEntity?: (id: string) => void;
}> = ({ entity, links, events, onClose, onChat, onJumpToEntity }) => {
  const related = useMemo(() => links
    .filter(l => l.source === entity.id)
    .reduce<{ target: string; types: string[] }[]>((acc, l) => {
      const e = acc.find(r => r.target === l.target);
      if (e) e.types.push(l.type);
      else acc.push({ target: l.target, types: [l.type] });
      return acc;
    }, []), [entity, links]);
  const charEvents = useMemo(() => events.filter(ev => ev.chars.includes(entity.id)), [entity, events]);
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"Songti SC", "STSongti", "Noto Serif SC", "PingFang SC", serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '16px', padding: '3px 10px', borderRadius: '100px', color: '#78716c', background: '#f5f5f0' }}>人物</span>
          <div style={{ fontSize: '30px', fontWeight: 700, margin: '6px 0 14px 0', fontFamily: '"Songti SC", serif', color: '#44403c' }}>{entity.id}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', padding: '4px', borderRadius: '4px', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>描述</div>
        <div style={{ fontSize: '18px', lineHeight: 1.8, color: '#57534e' }}>{entity.desc}</div>
      </div>
      {entity.role && (
        <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>角色身份</div>
          <div style={{ fontSize: '18px', lineHeight: 1.8, color: '#57534e' }}>{entity.role}</div>
        </div>
      )}
      {entity.tags?.length > 0 && (
        <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>标签</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {entity.tags.map((t: string, i: number) => (
              <span key={i} style={{ padding: '5px 12px', background: '#f5f5f0', borderRadius: '8px', fontSize: '16px', color: '#57534e' }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      {entity.quotes?.length > 0 && (
        <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>经典语录</div>
          {entity.quotes.slice(0, 3).map((q: string, i: number) => (
            <div key={i} style={{ padding: '14px 18px', borderLeft: '2px solid #d9cec0', fontSize: '18px', fontStyle: 'italic', lineHeight: 1.7, color: '#57534e', marginBottom: '8px' }}>{q}</div>
          ))}
        </div>
      )}
      {related.length > 0 && (
        <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>关联角色</div>
          {related.map((r, i) => (
            <div key={i}
              onClick={() => onJumpToEntity?.(r.target)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f5f5f0', borderRadius: '12px', border: '1px solid #e7e5e4', marginBottom: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e7e5e4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f5f0'; }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#44403c', fontFamily: '"Songti SC", serif', fontSize: '18px' }}>{r.target}</span>
                <span style={{ fontSize: '16px', color: '#a8a29e', marginLeft: '8px' }}>/ {r.types.join('、')}</span>
              </div>
              <span style={{ fontSize: '16px', color: '#a8a29e' }}>查看 →</span>
            </div>
          ))}
        </div>
      )}
      {charEvents.length > 0 && (
        <div>
          <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>相关事件</div>
          {charEvents.map((ev, i) => (
            <div key={i} style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '2px solid #d9cec0' }}>
              <div style={{ fontWeight: 600, fontSize: '19px', color: '#44403c', fontFamily: '"Songti SC", serif', marginBottom: '2px' }}>{ev.name}</div>
              <div style={{ fontSize: '18px', color: '#78716c', lineHeight: 1.7 }}>{ev.desc}</div>
            </div>
          ))}
        </div>
      )}
      {/* 对话按钮 */}
      <button onClick={onChat}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#44403c', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '19px', cursor: 'pointer', fontFamily: '"Songti SC", serif', marginTop: '8px' }}>
        <MessageCircle size={18} /> 与先生聊{entity.id}
      </button>
    </div>
  );
};

// --- 图谱 D3 组件 ---
const ForceGraph: React.FC<{
  graphData: V7GraphData;
  onSelect: (entity: any) => void;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}> = ({ graphData, onSelect, selectedId, hoveredId, onHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const colors = relColors;

    d3.select(container).selectAll('svg').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 0);

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (e) => { g.attr('transform', e.transform); });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1.2).translate(-width / 2, -height / 2));

    const nodes = graphData.characters.map(d => ({ ...d }));
    const links = graphData.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(40))
      .alphaDecay(0.02);

    const linkGroup = g.append('g');
    const link = linkGroup.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => colors[d.type] || '#666')
      .attr('stroke-width', 1.2);

    const nodeGroup = g.append('g');
    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, any>()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    function highlightNode(id: string) {
      const directLinkSet = new Set<any>();
      const connectedNodes = new Set<string>();
      links.forEach((l: any) => {
        if (l.source.id === id || l.target.id === id) {
          directLinkSet.add(l);
          connectedNodes.add(l.source.id);
          connectedNodes.add(l.target.id);
        }
      });
      node.selectAll('circle')
        .attr('opacity', (n: any) => connectedNodes.has(n.id) ? 1 : 0.15)
        .attr('stroke', (n: any) => n.id === id ? '#B98A38' : (n.id === '狂人' ? '#942C27' : '#A3A2A2'))
        .attr('stroke-width', (n: any) => n.id === id ? 3.5 : (n.id === '狂人' ? 3 : 2));
      node.selectAll('text').attr('opacity', (n: any) => connectedNodes.has(n.id) ? 1 : 0.15);
      link.attr('opacity', (l: any) => directLinkSet.has(l) ? 1 : 0.05)
        .attr('stroke-width', (l: any) => directLinkSet.has(l) ? 3 : 0.5);
    }

    function resetHighlight() {
      node.selectAll('circle').attr('opacity', 1)
        .attr('stroke', (n: any) => n.id === '狂人' ? '#942C27' : '#A3A2A2')
        .attr('stroke-width', (n: any) => n.id === '狂人' ? 3 : 2);
      node.selectAll('text').attr('opacity', 1);
      link.attr('opacity', 1).attr('stroke-width', 1.2);
    }

    node.append('circle')
      .attr('r', (d: any) => d.id === '狂人' ? 16 : 11)
      .attr('fill', (d: any) => d.id === '狂人' ? '#942C27' : '#A3A2A2')
      .attr('stroke', (d: any) => d.id === '狂人' ? '#942C27' : '#A3A2A2')
      .attr('stroke-width', (d: any) => d.id === '狂人' ? 3 : 2);

    node.append('text')
      .text((d: any) => d.id)
      .attr('dx', 18).attr('dy', 4)
      .style('font-size', (d: any) => d.id === '狂人' ? '20px' : '17px')
      .style('fill', (d: any) => d.id === '狂人' ? '#C0544E' : '#1F2937')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('font-family', '"Songti SC", serif')
      .style('paint-order', 'stroke')
      .style('stroke', '#fafaf7')
      .style('stroke-width', '3px')
      .style('stroke-linecap', 'round')
      .style('stroke-linejoin', 'round');

    // 浮移动画
    nodes.forEach((d: any) => { d._fo = Math.random() * Math.PI * 2; });
    const floatAmp = 3, floatSpeed = 0.6;
    let floatTime = 0;
    const floatInterval = setInterval(() => {
      floatTime += 0.05;
      node.attr('transform', (d: any) => {
        const fx = Math.sin(floatTime * floatSpeed + d._fo) * floatAmp;
        const fy = Math.cos(floatTime * floatSpeed * 0.7 + d._fo) * floatAmp;
        return `translate(${d.x + fx},${d.y + fy})`;
      });
    }, 50);

    node.on('mouseenter', function(e, d: any) { onHover(d.id); highlightNode(d.id); });
    node.on('mouseleave', function() {
      onHover(null);
      if (selectedId) highlightNode(selectedId);
      else resetHighlight();
    });
    node.on('click', function(e, d: any) { e.stopPropagation(); onSelect(d); highlightNode(d.id); });
    svg.on('click', function(e) {
      if (e.target === this || e.target.tagName === 'svg') { resetHighlight(); onSelect(null); }
    });

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    simulation.alpha(1).restart();

    if (selectedId) setTimeout(() => highlightNode(selectedId), 100);

    return () => { simulation.stop(); clearInterval(floatInterval); };
  }, [graphData]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
};

// --- 主组件 ---
export default function NovelWorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const router = useRouter();
  const [graphData, setGraphData] = useState<V7GraphData | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([
    { role: 'lx', content: '这日记里写的，你看出什么了？' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/kr-graph-v7.json`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(setGraphData)
      .catch(err => console.error('加载图谱失败:', err));
  }, [slug]);

  // 加载 Google Fonts (ZCOOL QingKe HuangYou)
  useEffect(() => {
    if (!document.querySelector(`link[href="${fontLink}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontLink;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSelect = useCallback((entity: any) => {
    setSelectedEntity(entity || null);
  }, []);

  const jumpToEntity = useCallback((id: string) => {
    const entity = graphData?.characters.find((c: V7Character) => c.id === id);
    if (entity) setSelectedEntity(entity);
  }, [graphData]);

  const handleOpenChat = () => {
    setChatOpen(true);
    setSelectedEntity(null);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `（用户正在《狂人日记》人物世界图谱中与你对话）${text}` }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'lx', content: data.text }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'lx', content: '唔，笔墨干涸了。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f0', color: '#44403c', fontFamily: '"Songti SC", "STSongti", "Noto Serif SC", "PingFang SC", serif', overflow: 'hidden' }}>
      {/* 图谱区域 */}
      <div ref={wrapRef} style={{ flex: 2, position: 'relative', background: '#fafaf7', overflow: 'hidden' }}>
        {/* 返回按钮 */}
        <button onClick={() => router.push('/')}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 20, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.85)', border: '1px solid #e7e5e4', borderRadius: '24px', fontSize: '16px', color: '#78716c', cursor: 'pointer', fontFamily: '"PingFang SC", sans-serif', backdropFilter: 'blur(8px)' }}>
          <ArrowLeft size={16} /> 返回藏书阁
        </button>

        {/* 标题 */}
        <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, textAlign: 'center', pointerEvents: 'none' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#44403c', fontFamily: '"PingFang SC", "WenQuanYi Micro Hei", "Noto Sans SC", sans-serif', letterSpacing: '0.25em', margin: 0 }}>
            狂人日记的世界
          </h1>
        </div>

        {/* D3 图谱 */}
        {graphData && (
          <ForceGraph graphData={graphData} onSelect={handleSelect}
            selectedId={selectedEntity?.id || null} hoveredId={hoveredId} onHover={setHoveredId} />
        )}

        {/* 图例 */}
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px', backdropFilter: 'blur(8px)', zIndex: 10 }}>
          {Object.entries(relColors).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', color: '#78716c' }}>
              <span style={{ width: '24px', height: '2px', borderRadius: '1px', background: color }}></span>
              {type}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧栏 */}
      <div style={{ flex: 1, background: '#fff', borderLeft: '1px solid #e7e5e4', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {chatOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 聊天头部 */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#44403c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontFamily: '"Songti SC", serif' }}>迅</div>
                <div>
                  <h3 style={{ fontFamily: '"Songti SC", serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>数字鲁迅</h3>
                  <p style={{ fontSize: '16px', color: '#a8a29e', margin: 0 }}>狂人日记的世界</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* 聊天消息 */}
            <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '90%', padding: '12px 16px', borderRadius: '16px', fontSize: '19px', lineHeight: 1.8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontFamily: msg.role === 'lx' ? '"Songti SC", serif' : '"PingFang SC", sans-serif', color: msg.role === 'user' ? '#fff' : '#57534e', background: msg.role === 'user' ? '#44403c' : '#f5f5f0', borderTopRightRadius: msg.role === 'user' ? '4px' : '16px', borderTopLeftRadius: msg.role === 'lx' ? '4px' : '16px' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '16px', color: '#a8a29e', fontFamily: '"Songti SC", serif', fontStyle: 'italic', padding: '8px' }}>研墨中...</div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e7e5e4' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="问先生..."
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e7e5e4', borderRadius: '10px', fontSize: '16px', outline: 'none', background: '#f5f5f0', color: '#44403c', fontFamily: '"PingFang SC", sans-serif' }}
                />
                <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}
                  style={{ padding: '10px', background: '#44403c', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', opacity: (chatLoading || !chatInput.trim()) ? 0.4 : 1 }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 侧栏头部 */}
            <div style={{ padding: '20px 32px 12px', borderBottom: '1px solid #e7e5e4' }}>
              <h1 style={{ fontSize: '16px', color: '#a8a29e', fontWeight: 400, letterSpacing: '0.15em', margin: 0 }}>狂人日记的世界 · 人物图谱</h1>
              <div style={{ fontSize: '16px', color: '#c2bdb7', marginTop: '2px' }}>点击图中人物查看详情</div>
            </div>

            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
              {selectedEntity ? (
                <EntityDetail entity={selectedEntity} links={graphData?.links || []} events={graphData?.events || []}
                  onClose={() => setSelectedEntity(null)} onChat={handleOpenChat} onJumpToEntity={jumpToEntity} />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* 初始侧栏：狂人日记介绍 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ width: '72px', height: '72px', background: '#44403c', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '36px', fontFamily: '"Songti SC", serif', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>狂</div>
                    <div>
                      <h2 style={{ fontFamily: '"Songti SC", serif', fontSize: '22px', fontWeight: 700, margin: 0, color: '#44403c' }}>狂人日记</h2>
                      <p style={{ fontSize: '16px', color: '#a8a29e', letterSpacing: '0.1em', margin: '4px 0 0 0' }}>1918年 · 鲁迅</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>背景</div>
                    <p style={{ fontSize: '19px', lineHeight: 1.8, color: '#57534e', margin: 0 }}>《狂人日记》是鲁迅1918年发表的首篇白话短篇小说，也是中国现代文学的开山之作。小说通过一位"狂人"的日记体自述，揭示了封建礼教"吃人"的本质。</p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#a8a29e', marginBottom: '8px' }}>内容摘要</div>
                    <p style={{ fontSize: '19px', lineHeight: 1.8, color: '#57534e', margin: 0 }}>狂人感到处处被人跟踪、议论——赵贵翁的眼色、路人的交头接耳、小孩子的铁青脸色、赵家的狗看了他两眼……他逐步"发现"身边所有人都在密谋吃他，连大哥也请来了医生"揣一揣肥瘠"。读史时，他在字缝里看出"吃人"二字，最终觉悟——这四千年来一直吃人的，正是仁义道德掩盖下的封建礼教。</p>
                  </div>

                  <div style={{ padding: '16px', background: '#f5f5f0', borderRadius: '12px', border: '1px solid #e7e5e4', marginBottom: '24px' }}>
                    <p style={{ fontSize: '16px', color: '#78716c', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>点击图中人物查看详情，或点击下方按钮与先生对话。</p>
                  </div>

                  <button onClick={handleOpenChat}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#44403c', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '18px', cursor: 'pointer', fontFamily: '"Songti SC", serif' }}>
                    <MessageCircle size={18} /> 与先生聊狂人日记
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
