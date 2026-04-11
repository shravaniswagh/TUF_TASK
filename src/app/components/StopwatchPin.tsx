import { useState, useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { X, GripVertical, Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

interface StopwatchPinProps {
  pin: PinData;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  isDark: boolean;
  isLocked: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onToggleFocus?: (taskId: string | null) => void;
  onFocusIncrement?: () => void;
  activeTaskId?: string | null;
  activeTaskName?: string | null;
}

const PIN_HEAD_COLORS: Record<string, string> = THEME_CONFIG.pinHeads;

function getContrastColor(hexColor?: string) {
  if (!hexColor || hexColor === 'transparent') return 'text-slate-700';
  const hex = hexColor.replace('#', '');
  let fullHex = hex;
  if (hex.length === 3) fullHex = hex.split('').map(c => c + c).join('');
  if (fullHex.length !== 6) return 'text-slate-900'; 
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? 'text-slate-900' : 'text-slate-50';
}

function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const FlipUnit = ({ value, label, isFullscreen }: { value: number; label: string; isFullscreen?: boolean }) => {
  const formattedValue = value.toString().padStart(2, '0');
  const prevValue = useRef(formattedValue);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (formattedValue !== prevValue.current) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
        prevValue.current = formattedValue;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [formattedValue]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative ${isFullscreen ? 'w-48 h-64 text-8xl' : 'w-20 h-28 text-5xl'} bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl border border-white/5`}>
        {/* Top Half */}
        <div className="absolute inset-0 flex items-center justify-center font-black text-[#e5e5e5] h-1/2 bg-[#1a1a1a] border-b border-black/20">
          <span className="translate-y-1/2">{formattedValue}</span>
        </div>
        {/* Bottom Half */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center font-black text-[#e5e5e5] overflow-hidden bg-[#1a1a1a]">
          <span className="-translate-y-1/2">{formattedValue}</span>
        </div>

        {/* Animation Flip Card */}
        <AnimatePresence mode="popLayout">
          {isFlipping && (
            <motion.div
              key={formattedValue}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: -180 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 z-20 origin-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 backface-hidden flex items-center justify-center font-black text-[#e5e5e5] h-1/2 bg-[#1a1a1a] border-b border-black/20 overflow-hidden">
                <span className="translate-y-1/2">{prevValue.current}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/40 z-10" />
      </div>
      <span className={`font-bold uppercase tracking-widest ${isFullscreen ? 'text-xs text-white/40' : 'text-[10px] text-slate-500'}`}>{label}</span>
    </div>
  );
};

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, isDragging, isDark, isLocked, isSelected, onSelect, activeTaskId, activeTaskName, onFocusIncrement 
}: StopwatchPinProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seconds, setSeconds] = useState(pin.totalSeconds || 0);
  const [isActive, setIsActive] = useState(!pin.isPaused);
  
  useEffect(() => {
    let interval: any;
    if (isActive && !pin.isPaused) {
      interval = setInterval(() => {
        setSeconds(s => {
          const next = s + 1;
          onUpdate(pin.id, { totalSeconds: next });
          onFocusIncrement?.();
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, pin.isPaused, pin.id, onUpdate]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const handleToggle = () => {
    onUpdate(pin.id, { isPaused: !pin.isPaused });
    setIsActive(!pin.isPaused);
  };

  const handleReset = () => {
    onUpdate(pin.id, { totalSeconds: 0, isPaused: true });
    setSeconds(0);
    setIsActive(false);
  };

  const pinHeadColor = PIN_HEAD_COLORS[pin.type] || '#6366F1';
  const defaultBg = isDark ? '#1a1a1a' : '#f8fafc';
  const bgColor = pin.color || defaultBg;
  const textColorClass = getContrastColor(bgColor);

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _dir, _ref, d) => {
        if (isLocked) return;
        onUpdate(pin.id, { width: pin.width + d.width, height: pin.height + d.height });
      }}
      minWidth={320}
      minHeight={240}
      className={`${isFullscreen ? '!fixed !inset-0 !w-full !h-full !z-[10000] !m-0 !p-0' : ''}`}
      style={{
        position: 'absolute',
        left: isFullscreen ? 0 : pin.x,
        top: isFullscreen ? 0 : pin.y,
        zIndex: isFullscreen ? 10000 : (isDragging ? 9999 : (pin.zIndex ?? 1)),
      }}
    >
      <motion.div
        className={`w-full h-full flex flex-col rounded-3xl overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500/50 shadow-2xl scale-[1.02]' : ''}`}
        onClick={onSelect}
        style={{
          backgroundColor: isFullscreen ? '#0a0a0a' : bgColor,
          boxShadow: isFullscreen ? 'none' : (isSelected ? '0 20px 40px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.07)'),
          border: isFullscreen ? 'none' : (isSelected ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.05)'),
        }}
      >
        {!isFullscreen && (
          <>
            {/* Pin Head */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div
                className="w-5 h-5 rounded-full shadow-md"
                style={{ backgroundColor: pinHeadColor }}
              />
              <div
                className="w-1.5 h-2 rounded-b-sm mx-auto"
                style={{ backgroundColor: pinHeadColor, opacity: 0.6 }}
              />
            </div>

            {/* Header */}
            <div
              onMouseDown={(e) => {
                if (isLocked) return;
                e.preventDefault();
                e.stopPropagation();
                onDragStart(pin.id, e);
              }}
              className="flex items-center justify-between px-4 pt-4 pb-2 cursor-grab active:cursor-grabbing shrink-0"
              style={{ backgroundColor: textColorClass.includes('slate-50') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <span className={`text-xs font-bold uppercase tracking-widest ${textColorClass}`}>Timer</span>
              </div>
              {!isLocked && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                  className={`w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors`}
                >
                  <X className={`w-4 h-4 ${textColorClass.includes('slate-50') ? 'text-slate-300' : 'text-slate-500'}`} />
                </button>
              )}
            </div>
          </>
        )}

        {/* Display */}
        <div className={`flex-1 flex flex-col items-center justify-center gap-8 ${isFullscreen ? 'bg-black p-12' : 'p-6'}`}>
          <motion.div 
            animate={isFullscreen ? {
              scale: [1, 1.03, 1],
            } : {}}
            transition={isFullscreen ? {
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
            className="flex items-center gap-4 md:gap-8"
          >
            <FlipUnit value={h} label="Hours" isFullscreen={isFullscreen} />
            <FlipUnit value={m} label="Minutes" isFullscreen={isFullscreen} />
            <FlipUnit value={s} label="Seconds" isFullscreen={isFullscreen} />
          </motion.div>

          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleToggle}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isActive && !pin.isPaused ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {pin.isPaused ? <Play className="w-6 h-6 text-white ml-1 fill-white" /> : <Pause className="w-6 h-6 text-white" />}
              </button>
              <button 
                onClick={handleReset}
                className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/10 dark:bg-white/5 border border-white/10 hover:bg-white/20 transition-all shadow-md active:scale-95`}
              >
                <RotateCcw className={`w-5 h-5 ${isFullscreen ? 'text-white/60' : (textColorClass.includes('slate-50') ? 'text-white' : 'text-slate-600')}`} />
              </button>
            </div>

            {activeTaskId && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm animate-pulse ${isFullscreen ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-500/10 border-indigo-500/20'}`}
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isFullscreen ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Focused: {activeTaskName || 'Active Task'}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Toggle FS Button */}
        <div className="absolute bottom-6 right-6 z-10">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all text-white/60 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </motion.div>
    </Resizable>
  );
}
