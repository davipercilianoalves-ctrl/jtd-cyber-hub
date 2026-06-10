import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Move, Send, Minus, Maximize2 } from 'lucide-react';

interface FloatingKeywordPanelProps {
  title: string;
  keywords: string[];
  onClose: () => void;
  onRemoveKeyword: (keyword: string) => void;
  onAddKeyword: (keyword: string) => void;
  onSendToProduct?: (keywords: string[]) => void;
  initialX?: number;
  initialY?: number;
  isGeneral?: boolean;
}

export default function FloatingKeywordPanel({
  title,
  keywords,
  onClose,
  onRemoveKeyword,
  onAddKeyword,
  onSendToProduct,
  initialX = 100,
  initialY = 100,
}: FloatingKeywordPanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: 360, h: 380 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [newKeyword, setNewKeyword] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const nx = Math.min(Math.max(0, e.clientX - dragOffset.x), vw - size.w);
        const ny = Math.min(Math.max(0, e.clientY - dragOffset.y), vh - 60);
        setPosition({ x: nx, y: ny });
      } else if (isResizing) {
        const newW = Math.min(Math.max(280, e.clientX - position.x), 700);
        const newH = Math.min(Math.max(220, e.clientY - position.y), 700);
        setSize({ w: newW, h: newH });
      }
    };
    const onUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, isResizing, dragOffset, position, size.w]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
    }
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newKeyword.trim()) {
      onAddKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

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
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex cursor-move items-center justify-between border-b border-primary/30 px-4 py-2.5 bg-primary/5 select-none"
      >
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-primary" />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Move size={12} className="text-muted-foreground opacity-50 mr-1" />
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title={minimized ? 'Expandir' : 'Minimizar'}
          >
            {minimized ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <form onSubmit={handleAdd} className="mb-4 flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Nova palavra..."
                className="flex-1 rounded border border-sidebar-border bg-internal-20 px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded bg-primary px-3 py-1.5 text-[10px] font-black text-primary-foreground hover:brightness-110 uppercase tracking-wider"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {keywords.length === 0 ? (
                <p className="w-full py-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground opacity-50">
                  Vazio
                </p>
              ) : (
                keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-bold text-primary"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => onRemoveKeyword(kw)}
                      className="text-primary/60 hover:text-primary"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          {onSendToProduct && keywords.length > 0 && (
            <div className="border-t border-primary/20 p-3">
              <button
                type="button"
                onClick={() => onSendToProduct(keywords)}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary/15 border border-primary/40 px-3 py-2 text-[10px] font-black text-primary hover:bg-primary/25 transition-colors uppercase tracking-wider"
              >
                <Send size={12} />
                Enviar para Lista do Produto
              </button>
            </div>
          )}

          {/* Resize handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{
              background:
                'linear-gradient(135deg, transparent 50%, hsl(var(--primary) / 0.5) 50%, hsl(var(--primary) / 0.5) 60%, transparent 60%, transparent 70%, hsl(var(--primary) / 0.5) 70%, hsl(var(--primary) / 0.5) 80%, transparent 80%)',
            }}
          />
        </>
      )}
    </div>
  );
}
