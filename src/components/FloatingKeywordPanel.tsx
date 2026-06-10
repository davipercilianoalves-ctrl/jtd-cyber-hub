import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Move, Send, Minus, Maximize2, Plus, AlertTriangle } from 'lucide-react';

interface FloatingKeywordPanelProps {
  title: string;
  targetTitle?: string | null;
  keywords: string[];
  allKeywords?: string[];
  onClose: () => void;
  onRemoveKeyword: (keyword: string) => void;
  onAddKeyword: (keyword: string) => void;
  onSendToProduct?: (keywords: string[]) => void;
  initialX?: number;
  initialY?: number;
}

export default function FloatingKeywordPanel({
  title,
  targetTitle,
  keywords,
  allKeywords = [],
  onClose,
  onRemoveKeyword,
  onAddKeyword,
  onSendToProduct,
  initialX = 100,
  initialY = 100,
}: FloatingKeywordPanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: 380, h: 420 });
  const [userResized, setUserResized] = useState(false);
  const [dragMode, setDragMode] = useState<null | 'move' | 'se' | 'e' | 's'>(null);
  const [minimized, setMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [newKeyword, setNewKeyword] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const hasTarget = !!targetTitle;

  // Auto-grow with content until user manually resizes
  useEffect(() => {
    if (userResized) return;
    const rows = Math.ceil(Math.max(keywords.length, allKeywords.length) / 4);
    const targetH = Math.min(380 + rows * 22, 640);
    const targetW = Math.min(380 + Math.floor(rows / 2) * 20, 640);
    setSize((s) => ({ w: Math.max(s.w, targetW), h: Math.max(s.h, targetH) }));
  }, [keywords.length, allKeywords.length, userResized]);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (dragMode === 'move') {
        const nx = Math.min(Math.max(0, e.clientX - dragOffset.x), vw - 100);
        const ny = Math.min(Math.max(0, e.clientY - dragOffset.y), vh - 60);
        setPosition({ x: nx, y: ny });
      } else {
        setUserResized(true);
        setSize((prev) => {
          let w = prev.w, h = prev.h;
          if (dragMode === 'e' || dragMode === 'se') {
            w = Math.min(Math.max(300, e.clientX - position.x), vw - position.x - 4);
          }
          if (dragMode === 's' || dragMode === 'se') {
            h = Math.min(Math.max(240, e.clientY - position.y), vh - position.y - 4);
          }
          return { w, h };
        });
      }
    };
    const onUp = () => setDragMode(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragMode, dragOffset, position]);

  const handleHeaderDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragMode('move');
    }
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasTarget) return;
    const v = newKeyword.trim();
    if (v) {
      v.split(',').map((s) => s.trim()).filter(Boolean).forEach(onAddKeyword);
      setNewKeyword('');
    }
  };

  const suggestions = allKeywords.filter((k) => !keywords.includes(k));

  return (
    <div
      ref={panelRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.w}px`,
        height: minimized ? 'auto' : `${size.h}px`,
        position: 'fixed',
        zIndex: 100,
      }}
      className="jtd-glass flex flex-col bg-card/95 backdrop-blur-xl border-2 border-primary shadow-[0_0_40px_rgba(191,255,0,0.25)] animate-in zoom-in-95 duration-200 overflow-hidden"
    >
      <div
        onMouseDown={handleHeaderDown}
        className="flex cursor-grab active:cursor-grabbing items-center justify-between border-b border-primary/30 px-4 py-2.5 bg-primary/5 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={14} className="text-primary shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Move size={12} className="text-muted-foreground opacity-50 mr-1" />
          <button type="button" onClick={() => setMinimized(!minimized)} className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary" title={minimized ? 'Expandir' : 'Minimizar'}>
            {minimized ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Banner do alvo atual */}
          <div className={`px-4 py-2 border-b text-[10px] font-bold uppercase tracking-wider truncate ${
            hasTarget
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-500 flex items-center gap-2'
          }`}>
            {hasTarget ? targetTitle : (<><AlertTriangle size={12} /> Abra um concorrente para adicionar keywords</>)}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder={hasTarget ? "Nova palavra... (vírgulas)" : "Abra um concorrente..."}
                disabled={!hasTarget}
                className="flex-1 rounded border border-sidebar-border bg-internal-20 px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!hasTarget}
                className="rounded bg-primary px-3 py-1.5 text-[10px] font-black text-primary-foreground hover:brightness-110 uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Deste Concorrente ({keywords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.length === 0 ? (
                  <p className="w-full py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground opacity-50">Vazio</p>
                ) : (
                  keywords.map((kw, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {kw}
                      <button type="button" onClick={() => onRemoveKeyword(kw)} className="text-primary/60 hover:text-primary">
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Já usadas em outros ({suggestions.length}) — clique para adicionar
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((kw, i) => (
                    <button
                      type="button"
                      key={i}
                      disabled={!hasTarget}
                      onClick={() => onAddKeyword(kw)}
                      className="flex items-center gap-1 rounded bg-muted/40 border border-muted-foreground/20 px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={9} />
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onSendToProduct && keywords.length > 0 && (
            <div className="border-t border-primary/20 p-3">
              <button type="button" onClick={() => onSendToProduct(keywords)} className="flex w-full items-center justify-center gap-2 rounded bg-primary/15 border border-primary/40 px-3 py-2 text-[10px] font-black text-primary hover:bg-primary/25 transition-colors uppercase tracking-wider">
                <Send size={12} />
                Enviar para Lista do Produto
              </button>
            </div>
          )}

          {/* Resize handles */}
          <div
            onMouseDown={(e) => { e.preventDefault(); setDragMode('e'); }}
            className="absolute top-8 right-0 bottom-4 w-1.5 cursor-ew-resize hover:bg-primary/30"
          />
          <div
            onMouseDown={(e) => { e.preventDefault(); setDragMode('s'); }}
            className="absolute left-4 right-4 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30"
          />
          <div
            onMouseDown={(e) => { e.preventDefault(); setDragMode('se'); }}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{
              background:
                'linear-gradient(135deg, transparent 50%, hsl(var(--primary) / 0.6) 50%, hsl(var(--primary) / 0.6) 60%, transparent 60%, transparent 70%, hsl(var(--primary) / 0.6) 70%, hsl(var(--primary) / 0.6) 80%, transparent 80%)',
            }}
          />
        </>
      )}
    </div>
  );
}
