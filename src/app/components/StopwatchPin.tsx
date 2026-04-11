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
  activeTaskId?: string | null;
  activeTaskName?: string | null;
}

const FlipUnit = ({ value, label }: { value: number; label: string }) => {
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
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-28 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/5">
        {/* Top Half */}
        <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-[#e5e5e5] h-1/2 bg-[#1a1a1a] border-b border-black/20">
          <span className="translate-y-1/2">{formattedValue}</span>
        </div>
        {/* Bottom Half */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center text-5xl font-black text-[#e5e5e5] overflow-hidden bg-[#1a1a1a]">
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
              {/* Front (Previous Value) */}
              <div className="absolute inset-0 backface-hidden flex items-center justify-center text-5xl font-black text-[#e5e5e5] h-1/2 bg-[#1a1a1a] border-b border-black/20 overflow-hidden">
                <span className="translate-y-1/2">{prevValue.current}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Middle Line shadow */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/40 z-10" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
};

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, isDragging, isDark, isLocked, isSelected, onSelect, onToggleFocus, activeTaskId, activeTaskName 
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

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _dir, _ref, d) => {
        onUpdate(pin.id, { width: pin.width + d.width, height: pin.height + d.height });
      }}
      minWidth={320}
      minHeight={240}
      className={`${isFullscreen ? '!fixed !inset-0 !w-full !h-full !z-[10000] !m-0 !p-0' : ''}`}
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        zIndex: isDragging ? 9999 : (pin.zIndex ?? 1),
      }}
    >
      <motion.div
        className={`w-full h-full flex flex-col bg-[#0a0a0a] rounded-3xl shadow-2xl overflow-hidden border border-white/10 ${isSelected ? 'ring-4 ring-indigo-500/50' : ''}`}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
            >
              <X className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Volume2 className="w-5 h-5 text-white/40 cursor-pointer hover:text-white" />
            <RotateCcw className="w-5 h-5 text-white/40 cursor-pointer hover:text-white" onClick={handleReset} />
            <Settings className="w-5 h-5 text-white/40 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Flip Clock Display */}
        <div className="flex-1 flex items-center justify-center gap-4 p-8">
          <FlipUnit value={h} label="Hours" />
          <FlipUnit value={m} label="Minutes" />
          <FlipUnit value={s} label="Seconds" />
        </div>

        {/* Footer / Controls */}
        <div className="p-8 flex flex-col items-center gap-6">
          <button 
            onClick={handleToggle}
            className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-xl group"
          >
            {pin.isPaused ? (
              <Play className="w-8 h-8 text-white ml-1 fill-white" />
            ) : (
              <Pause className="w-8 h-8 text-white" />
            )}
          </button>

          {activeTaskId && (
            <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Focusing: {activeTaskName || 'Active Task'}
              </span>
            </div>
          )}

          <div className="absolute bottom-6 right-6">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-white/60" /> : <Maximize2 className="w-5 h-5 text-white/60" />}
            </button>
          </div>
        </div>
      </motion.div>
    </Resizable>
  );
}
