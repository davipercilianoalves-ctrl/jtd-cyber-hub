import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Move, Minus, Maximize2, Send, AlertTriangle, List, ListX } from 'lucide-react';

export interface KeywordSource {
  keyword: string;
  sources: Array<{ label: string; isCurrent: boolean }>;
}

interface FloatingKeywordPanelProps {
  title: string;
  targetTitle?: string | null;
  keywordSources: KeywordSource[];
  onClose: () => void;
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  onSendToProduct?: () => void;
  initialX?: number;
  initialY?: number;
}

export default function FloatingKeywordPanel({
  title,
  targetTitle,
  keywordSources,
  onClose,
  onAddKeyword,
  onRemoveKeyword,
  onSendToProduct,
  initialX = 100,
  initialY = 100,
}: FloatingKeywordPanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: 320, h: 280 });
  const [userResized, setUserResized] = useState(false);
  const [dragMode, setDragMode] = useState<null | 'move' | 'se' | 'e' | 's'>(null);
  const [minimized, setMinimized] = useState(false);
  const [compact, setCompact] = useState(false); // input-only mode
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [newKeyword, setNewKeyword] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const hasTarget = !!targetTitle;

  // Auto-grow with content until user manually resizes or in compact mode
  useEffect(() => {
    if (userResized || compact) return;
    const rows = Math.ceil(keywordSources.length / 5);
    const targetH = Math.min(220 + rows * 26, 560);
    setSize((s) => ({ w: s.w, h: Math.max(s.h, targetH) }));
  }, [keywordSources.length, userResized, compact]);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (dragMode === 'move') {
        setPosition({
          x: Math.min(Math.max(0, e.clientX - dragOffset.x), vw - 100),
          y: Math.min(Math.max(0, e.clientY - dragOffset.y), vh - 60),
        });
      } else {
        setUserResized(true);
        setSize((prev) => {
          let w = prev.w, h = prev.h;
          if (dragMode === 'e' || dragMode === 'se') w = Math.min(Math.max(260, e.clientX - position.x), vw - position.x - 4);
          if (dragMode === 's' || dragMode === 'se') h = Math.min(Math.max(160, e.clientY - position.y), vh - position.y - 4);
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

  const displayHeight = (minimized || compact) ? 'auto' : `${size.h}px`;

  return (
    <div
      ref={panelRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.w}px`,
        height: displayHeight,
        position: 'fixed',
        zIndex: 100,
      }}
      className="jtd-glass flex flex-col bg-card/95 backdrop-blur-xl border-2 border-primary shadow-[0_0_40px_rgba(191,255,0,0.25)] animate-in zoom-in-95 duration-200 overflow-hidden"
    >
      {/* HEADER */}
      <div
        onMouseDown={handleHeaderDown}
        className="flex cursor-grab active:cursor-grabbing items-center justify-between border-b border-primary/30 px-2.5 py-1.5 bg-primary/5 select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Tag size={11} className="text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Move size={10} className="text-muted-foreground opacity-40 mr-0.5" />
          <button
            type="button"
            onClick={() => setCompact(!compact)}
            className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title={compact ? 'Mostrar lista' : 'Esconder lista (só input)'}
          >
            {compact ? <List size={11} /> : <ListX size={11} />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title={minimized ? 'Expandir' : 'Minimizar'}
          >
            {minimized ? <Maximize2 size={11} /> : <Minus size={11} />}
          </button>
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <X size={12} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Target banner */}
          <div className={`px-2.5 py-1 border-b text-[9px] font-bold uppercase tracking-wider truncate ${
            hasTarget
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-500 flex items-center gap-1.5'
          }`}>
            {hasTarget ? targetTitle : (<><AlertTriangle size={10} /> Abra um concorrente</>)}
          </div>

          {/* Input row */}
          <form onSubmit={handleAdd} className="flex gap-1.5 p-2 border-b border-sidebar-border/30">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder={hasTarget ? 'Nova palavra... (vírgulas)' : 'Abra um concorrente...'}
              disabled={!hasTarget}
              className="flex-1 rounded border border-sidebar-border bg-internal-20 px-2 py-1 text-[11px] text-foreground focus:border-primary focus:outline-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!hasTarget}
              className="rounded bg-primary px-2.5 py-1 text-[9px] font-black text-primary-foreground hover:brightness-110 uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>

          {/* Unified list (hidden in compact mode) */}
          {!compact && (
            <div className="flex-1 p-2 overflow-y-auto">
              {keywordSources.length === 0 ? (
                <p className="py-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground opacity-50">Nenhuma keyword</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {keywordSources.map((ks) => {
                    const isCurrent = ks.sources.some((s) => s.isCurrent);
                    const tooltip = ks.sources.map((s) => s.label).join(' • ');
                    return (
                      <span
                        key={ks.keyword}
                        title={tooltip}
                        onClick={() => {
                          if (!isCurrent && hasTarget) onAddKeyword(ks.keyword);
                        }}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                          isCurrent
                            ? 'bg-primary/20 border border-primary/50 text-primary'
                            : 'border border-muted-foreground/25 text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer'
                        } ${!hasTarget && !isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span>{ks.keyword}</span>
                        <span className="text-[8px] font-mono opacity-60">
                          {ks.sources.map((s) => s.label).join('')}
                        </span>
                        {isCurrent && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemoveKeyword(ks.keyword); }}
                            className="text-primary/60 hover:text-primary"
                          >
                            <X size={9} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {onSendToProduct && hasTarget && !compact && (
            <div className="border-t border-primary/20 p-1.5">
              <button
                type="button"
                onClick={onSendToProduct}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-primary/15 border border-primary/40 px-2 py-1 text-[9px] font-black text-primary hover:bg-primary/25 uppercase tracking-wider"
              >
                <Send size={10} /> Enviar para Lista do Produto
              </button>
            </div>
          )}

          {/* Resize handles */}
          {!compact && (
            <>
              <div onMouseDown={(e) => { e.preventDefault(); setDragMode('e'); }} className="absolute top-6 right-0 bottom-3 w-1.5 cursor-ew-resize hover:bg-primary/30" />
              <div onMouseDown={(e) => { e.preventDefault(); setDragMode('s'); }} className="absolute left-3 right-3 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30" />
              <div
                onMouseDown={(e) => { e.preventDefault(); setDragMode('se'); }}
                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
                style={{ background: 'linear-gradient(135deg, transparent 50%, hsl(var(--primary) / 0.6) 50%, hsl(var(--primary) / 0.6) 60%, transparent 60%, transparent 75%, hsl(var(--primary) / 0.6) 75%)' }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
