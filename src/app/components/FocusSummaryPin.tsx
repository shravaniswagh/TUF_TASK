import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Resizable } from 're-resizable';
import { Timer, Target, GripVertical, X, Settings2 } from 'lucide-react';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

interface FocusSummaryPinProps {
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
  onBringToFront: (id: string) => void;
  dailyTotal: number; // in seconds
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
  return brightness > 140 ? 'text-slate-600' : 'text-white';
}

export function FocusSummaryPin({ 
  pin, onUpdate, onDelete, onDragStart, onOpenInspector, isDragging, isDark, isLocked, isSelected, onSelect, onBringToFront, dailyTotal 
}: FocusSummaryPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hours = Math.floor(dailyTotal / 3600);
  const minutes = Math.floor((dailyTotal % 3600) / 60);
  const seconds = dailyTotal % 60;
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
      minWidth={200}
      minHeight={150}
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        zIndex: isDragging ? 1000 : (pin.zIndex ?? 1),
      }}
    >
      <motion.div
        className={`w-full h-full flex flex-col rounded-xl border border-black/5 transition-all duration-300 ${isSelected ? 'shadow-2xl' : ''} backdrop-blur-md`}
        onClick={() => {
          onSelect();
          onBringToFront(pin.id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: bgColor,
          boxShadow: isSelected ? '0 20px 40px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.07)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
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

        {/* Content Wrapper to fix clipping */}
        <div className="w-full h-full flex flex-col overflow-hidden rounded-xl">

        {/* Header */}
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 bg-black/[0.03] transition-colors"
          >
          <div 
            onMouseDown={(e) => {
              if (isLocked) return;
              e.preventDefault();
              e.stopPropagation();
              onDragStart(pin.id, e);
            }}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing grow"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span className={`text-xs capitalize tracking-wide font-medium ${textColorClass}`}>Focus Summary</span>
          </div>
          <div className="flex items-center gap-1">
            <AnimatePresence>
              {isHovered && !isLocked && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenInspector(pin.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 transition-all shadow-sm border border-black/5"
                 >
                   <Settings2 className={`w-3.5 h-3.5 ${textColorClass}`} />
                 </button>
                </motion.div>
              )}
            </AnimatePresence>
            {!isLocked && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl bg-black/5 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-black/5 group`}
                >
                  <X className={`w-3.5 h-3.5 ${textColorClass} group-hover:text-white`} />
                </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <Timer className="w-5 h-5 text-indigo-500" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${textColorClass}`}>Focused Time</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-black tracking-tighter tabular-nums ${textColorClass}`}>
              {hours}h {minutes}m <span className="text-xl opacity-60">{seconds}s</span>
            </span>
          </div>
          
          <div className="mt-4 flex items-center justify-between opacity-60">
             <div className="flex items-center gap-1.5">
               <Target className="w-3.5 h-3.5" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Active Tracking</span>
             </div>
          </div>
        </div>

        </div>
        <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      </motion.div>
    </Resizable>
  );
}
