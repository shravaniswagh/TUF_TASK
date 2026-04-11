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
  onToggleFullscreen?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
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

/**
 * Liquid Sliding Digit Component
 */
const LiquidDigit = ({ value, isFullscreen, textColor, fontFamily }: { 
  value: number; 
  isFullscreen?: boolean;
  textColor: string;
  fontFamily: string;
}) => {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const size = isFullscreen ? 160 : 64;
  const height = isFullscreen ? 180 : 80;

  return (
    <div 
      className="relative overflow-hidden flex items-center justify-center font-black tabular-nums tracking-tighter"
      style={{ 
        width: size, 
        height: height,
        fontSize: size,
        fontFamily 
      }}
    >
      <motion.div
        animate={{ y: -value * height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className="absolute top-0 flex flex-col items-center"
      >
        {digits.map(d => (
          <div key={d} style={{ height, color: textColor }} className="flex items-center justify-center">
            {d}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const DigitalUnit = ({ value, label, isFullscreen, textColor, fontFamily }: { 
  value: number; 
  label: string; 
  isFullscreen?: boolean;
  textColor: string;
  fontFamily: string;
}) => {
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-4">
      <div className="flex">
        <LiquidDigit value={tens} isFullscreen={isFullscreen} textColor={textColor} fontFamily={fontFamily} />
        <LiquidDigit value={ones} isFullscreen={isFullscreen} textColor={textColor} fontFamily={fontFamily} />
      </div>
      <span className={`font-black uppercase tracking-[0.3em] opacity-30 ${isFullscreen ? 'text-lg mt-4' : 'text-[9px]'}`} 
            style={{ color: textColor }}>{label}</span>
    </div>
  );
};

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, onOpenInspector, onToggleFullscreen, isFullscreen = false, isDragging, isDark, isLocked, isSelected, onSelect, activeTaskId, activeTaskName, onFocusIncrement 
}: StopwatchPinProps) {
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
  const bgColor = isFullscreen ? '#0a0a0a' : (pin.color || defaultBg);
  const textColorClass = getContrastColor(bgColor);
  
  const clockTextColor = pin.textColor || (textColorClass.includes('slate-50') ? '#ffffff' : '#1e293b');
  const customFont = pin.fontFamily || 'Inter, system-ui, sans-serif';

  // Progress Ring Logic
  const progress = (seconds % 3600) / 3600;
  const radius = isFullscreen ? 400 : 160;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'absolute',
        inset: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : pin.x,
        top: isFullscreen ? 0 : pin.y,
        zIndex: isFullscreen ? 10000 : (isDragging ? 9999 : (pin.zIndex ?? 1)),
        width: isFullscreen ? '100vw' : pin.width,
        height: isFullscreen ? '100vh' : pin.height,
      }}
      className={`${isFullscreen ? 'bg-black' : ''}`}
    >
      <Resizable
        size={{ width: isFullscreen ? '100%' : pin.width, height: isFullscreen ? '100%' : pin.height }}
        enable={(!isFullscreen && !isLocked) ? undefined : false}
        onResizeStop={(_e, _dir, _ref, d) => {
          if (isLocked || isFullscreen) return;
          onUpdate(pin.id, { width: pin.width + d.width, height: pin.height + d.height });
        }}
        minWidth={320}
        minHeight={240}
        className="w-full h-full"
      >
        <motion.div
          className={`w-full h-full flex flex-col relative transition-all duration-500 overflow-hidden ${isSelected ? 'ring-4 ring-indigo-500/50 shadow-2xl' : ''} ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
          onClick={onSelect}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: bgColor,
            boxShadow: isFullscreen ? 'none' : (isSelected ? '0 32px 64px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.07)'),
            border: isFullscreen ? 'none' : (isSelected ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.05)'),
          }}
        >
          {isFullscreen ? (
            /* Minimize Button - Top Right Immersive */
            <button 
              onClick={() => onToggleFullscreen?.(false)}
              className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 backdrop-blur-xl z-[10001] group"
            >
              <Minimize2 className="w-5 h-5 text-white opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <>
              {/* Pin Head */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="w-5 h-5 rounded-full shadow-md" style={{ backgroundColor: pinHeadColor }} />
                <div className="w-1.5 h-2 rounded-b-sm mx-auto" style={{ backgroundColor: pinHeadColor, opacity: 0.6 }} />
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
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-900'}`}>Stopwatch</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                   <AnimatePresence>
                      {isHovered && !isLocked && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFullscreen?.(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 transition-all"
                          >
                            <Maximize2 className={`w-4 h-4 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenInspector(pin.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 transition-all"
                          >
                            <Settings2 className={`w-4 h-4 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`} />
                          </button>
                        </motion.div>
                      )}
                   </AnimatePresence>
                   {!isLocked && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/10 transition-colors"
                    >
                      <X className={`w-4 h-4 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-500'}`} />
                    </button>
                   )}
                </div>
              </div>
            </>
          )}

          {/* Main Display Content */}
          <div className="flex-1 flex flex-col items-center justify-center relative p-6">
            {/* Background Focus Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
               <svg className={`transform -rotate-90 ${isFullscreen ? 'w-[120vh] h-[120vh]' : 'w-[200%] h-[200%]'}`} viewBox="0 0 1000 1000">
                  <circle
                    cx="500" cy="500" r={radius}
                    fill="none"
                    stroke={clockTextColor}
                    strokeWidth={isFullscreen ? "1" : "2"}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    className="transition-all duration-1000 ease-linear"
                  />
               </svg>
            </div>

            <div className="flex items-center gap-2 sm:gap-8 z-10">
              <DigitalUnit value={h} label="Hr" isFullscreen={isFullscreen} textColor={clockTextColor} fontFamily={customFont} />
              <div className={`font-black opacity-20 -mt-8 ${isFullscreen ? 'text-9xl' : 'text-5xl'}`} style={{ color: clockTextColor }}>:</div>
              <DigitalUnit value={m} label="Min" isFullscreen={isFullscreen} textColor={clockTextColor} fontFamily={customFont} />
              <div className={`font-black opacity-20 -mt-8 ${isFullscreen ? 'text-9xl' : 'text-5xl'}`} style={{ color: clockTextColor }}>:</div>
              <DigitalUnit value={s} label="Sec" isFullscreen={isFullscreen} textColor={clockTextColor} fontFamily={customFont} />
            </div>

            {/* Distraction-Free Controls */}
            <div className={`flex items-center gap-10 z-10 transition-all duration-500 ${isFullscreen ? 'mt-24' : 'mt-8'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className={`flex items-center justify-center rounded-full transition-all border border-white/5 shadow-lg active:scale-95 ${isFullscreen ? 'w-16 h-16 bg-white/5 hover:bg-white/10' : 'w-10 h-10 bg-black/5 hover:bg-black/10'}`}
                style={{ color: clockTextColor }}
              >
                <RotateCcw className={isFullscreen ? "w-6 h-6" : "w-4 h-4"} />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                className={`flex items-center justify-center rounded-full transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-white/10 active:scale-90 ${isFullscreen ? 'w-32 h-32 bg-white text-black hover:scale-105' : 'w-16 h-16 bg-indigo-500 text-white hover:bg-indigo-600'}`}
                style={isFullscreen ? {} : { backgroundColor: pinHeadColor }}
              >
                {isActive && !pin.isPaused ? (
                  <Pause className={isFullscreen ? "w-12 h-12" : "w-6 h-6"} fill="currentColor" />
                ) : (
                  <Play className={isFullscreen ? "w-12 h-12" : "w-6 h-6 ml-2"} fill="currentColor" />
                )}
              </button>

              <div className={isFullscreen ? "w-16" : "w-10"} /> {/* Spacing logic */}
            </div>

            {isFullscreen && activeTaskName && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 text-center"
              >
                <p className="text-white/30 uppercase font-black tracking-[0.4em] text-xs mb-2">Currently Focusing On</p>
                <h2 className="text-white text-3xl font-black">{activeTaskName}</h2>
              </motion.div>
            )}
          </div>
        </motion.div>
      </Resizable>
    </div>
  );
}
