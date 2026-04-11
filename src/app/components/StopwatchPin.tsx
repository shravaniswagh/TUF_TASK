import { useState, useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { X, GripVertical, Play, Pause, RotateCcw, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

interface StopwatchPinProps {
  pin: PinData;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onOpenInspector: (id: string) => void;
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

const FlipCard = ({ current, next, isFullscreen, itemColor, textColor, fontFamily }: { 
  current: string; 
  next: string; 
  isFullscreen?: boolean;
  itemColor: string;
  textColor: string;
  fontFamily: string;
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayNext, setDisplayNext] = useState(next);
  const [displayCurrent, setDisplayCurrent] = useState(current);

  useEffect(() => {
    if (next !== displayNext) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
        setDisplayCurrent(next);
        setDisplayNext(next);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [next, displayNext]);

  const sizeClass = isFullscreen ? 'w-48 h-64 text-8xl' : 'w-20 h-28 text-5xl';
  const radiusClass = isFullscreen ? 'rounded-[32px]' : 'rounded-xl';

  return (
    <div className={`relative ${sizeClass} perspective-1000`} style={{ fontFamily }}>
      {/* Static Top (Next Value) */}
      <div className={`absolute inset-0 flex items-center justify-center font-black ${radiusClass} overflow-hidden h-1/2 border-b border-black/10`} 
           style={{ backgroundColor: itemColor, color: textColor }}>
        <span className="translate-y-1/2">{displayNext}</span>
      </div>

      {/* Static Bottom (Current Value) */}
      <div className={`absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center font-black ${radiusClass} overflow-hidden`} 
           style={{ backgroundColor: itemColor, color: textColor }}>
        <span className="-translate-y-1/2">{displayCurrent}</span>
      </div>

      {/* Animated Flip Part */}
      <AnimatePresence>
        {isFlipping && (
          <motion.div
            key={displayCurrent}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -180 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-x-0 top-0 h-1/2 z-20 origin-bottom"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of flipping card (Top half of current value) */}
            <div className={`absolute inset-0 backface-hidden flex items-center justify-center font-black ${radiusClass} overflow-hidden border-b border-black/5`}
                 style={{ backgroundColor: itemColor, color: textColor }}>
              <span className="translate-y-1/2">{displayCurrent}</span>
            </div>
            
            {/* Back of flipping card (Bottom half of next value) */}
            <div className={`absolute inset-0 backface-hidden flex items-center justify-center font-black ${radiusClass} overflow-hidden`}
                 style={{ backgroundColor: itemColor, color: textColor, transform: 'rotateX(180deg)' }}>
              <span className="-translate-y-1/2">{displayNext}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual Slit */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/20 z-10" />
    </div>
  );
};

const FlipUnit = ({ value, label, isFullscreen, itemColor, textColor, fontFamily }: { 
  value: number; 
  label: string; 
  isFullscreen?: boolean;
  itemColor: string;
  textColor: string;
  fontFamily: string;
}) => {
  const valStr = value.toString().padStart(2, '0');
  const [prevVal, setPrevVal] = useState(valStr);

  useEffect(() => {
    if (valStr !== prevVal) {
      const timer = setTimeout(() => setPrevVal(valStr), 600);
      return () => clearTimeout(timer);
    }
  }, [valStr, prevVal]);

  return (
    <div className="flex flex-col items-center gap-4">
      <FlipCard 
        current={prevVal} 
        next={valStr} 
        isFullscreen={isFullscreen} 
        itemColor={itemColor} 
        textColor={textColor}
        fontFamily={fontFamily}
      />
      <span className={`font-black uppercase tracking-[0.2em] opacity-40 ${isFullscreen ? 'text-xs' : 'text-[10px]'}`} 
            style={{ color: textColor }}>{label}</span>
    </div>
  );
};

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, onOpenInspector, isDragging, isDark, isLocked, isSelected, onSelect, activeTaskId, activeTaskName, onFocusIncrement 
}: StopwatchPinProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
  }, [isActive, pin.isPaused, pin.id, onUpdate, onFocusIncrement]);

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
  
  const clockFaceColor = pin.itemColor || '#1a1a1a';
  const clockTextColor = pin.textColor || '#e5e5e5';
  const customFont = pin.fontFamily || 'system-ui';

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
        className={`w-full h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500/50 shadow-2xl' : ''}`}
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: isFullscreen ? '#0a0a0a' : bgColor,
          boxShadow: isFullscreen ? 'none' : (isSelected ? '0 32px 64px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.07)'),
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
              className="flex items-center justify-between px-5 pt-5 pb-2 cursor-grab active:cursor-grabbing shrink-0"
              style={{ backgroundColor: textColorClass.includes('slate-50') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${textColorClass}`}>Timer</span>
              </div>
              
              <div className="flex items-center gap-1">
                <AnimatePresence>
                  {isHovered && !isLocked && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                      onClick={(e) => { e.stopPropagation(); onOpenInspector(pin.id); }}
                      className={`w-7 h-7 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10`}
                    >
                      <Settings2 className={`w-4 h-4 ${textColorClass.includes('slate-50') ? 'text-white' : 'text-slate-600'}`} />
                    </motion.button>
                  )}
                </AnimatePresence>

                {!isLocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                    className={`w-7 h-7 flex items-center justify-center rounded-xl hover:bg-black/10 transition-colors`}
                  >
                    <X className={`w-4 h-4 ${textColorClass.includes('slate-50') ? 'text-slate-300' : 'text-slate-500'}`} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Display */}
        <div className={`flex-1 flex flex-col items-center justify-center gap-12 ${isFullscreen ? 'bg-black p-12' : 'p-8'}`}>
          <motion.div 
            animate={isFullscreen ? { scale: [1, 1.03, 1] } : {}}
            transition={isFullscreen ? { duration: 10, repeat: Infinity, ease: "easeInOut" } : {}}
            className="flex items-center gap-6 md:gap-10"
          >
            <FlipUnit value={h} label="Hours" isFullscreen={isFullscreen} itemColor={clockFaceColor} textColor={clockTextColor} fontFamily={customFont} />
            <FlipUnit value={m} label="Minutes" isFullscreen={isFullscreen} itemColor={clockFaceColor} textColor={clockTextColor} fontFamily={customFont} />
            <FlipUnit value={s} label="Seconds" isFullscreen={isFullscreen} itemColor={clockFaceColor} textColor={clockTextColor} fontFamily={customFont} />
          </motion.div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleToggle}
                className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all shadow-xl active:scale-95 ${isActive && !pin.isPaused ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {pin.isPaused ? <Play className="w-7 h-7 text-white ml-1 fill-white" /> : <Pause className="w-7 h-7 text-white" />}
              </button>
              <button 
                onClick={handleReset}
                className={`w-14 h-14 rounded-[20px] flex items-center justify-center bg-white/10 dark:bg-white/5 border border-white/10 hover:bg-white/20 transition-all shadow-lg active:scale-95`}
              >
                <RotateCcw className={`w-6 h-6 ${isFullscreen ? 'text-white/60' : (textColorClass.includes('slate-50') ? 'text-white' : 'text-slate-600')}`} />
              </button>
            </div>

            {activeTaskId && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-full border shadow-xl animate-pulse ${isFullscreen ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-500/10 border-indigo-500/20'}`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isFullscreen ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {activeTaskName || 'Active Task'}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Toggle FS Button */}
        <div className="absolute bottom-8 right-8 z-10">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-4 rounded-[20px] bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all text-white/60 hover:text-white shadow-2xl"
          >
            {isFullscreen ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
          </button>
        </div>
      </motion.div>
    </Resizable>
  );
}
