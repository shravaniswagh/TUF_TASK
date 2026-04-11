import { motion } from 'motion/react';
import { Resizable } from 're-resizable';
import { Target, Timer, TrendingUp } from 'lucide-react';
import { PinData } from './Pin';

interface FocusSummaryPinProps {
  pin: PinData;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  isDark: boolean;
  isLocked: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  dailyTotal: number; // in seconds
}

export function FocusSummaryPin({ 
  pin, onUpdate, onDelete, onDragStart, isDragging, isDark, isLocked, isSelected, onSelect, dailyTotal 
}: FocusSummaryPinProps) {
  const hours = Math.floor(dailyTotal / 3600);
  const minutes = Math.floor((dailyTotal % 3600) / 60);

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _dir, _ref, d) => {
        onUpdate(pin.id, { width: pin.width + d.width, height: pin.height + d.height });
      }}
      minWidth={200}
      minHeight={150}
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        zIndex: isDragging ? 9999 : (pin.zIndex ?? 1),
      }}
    >
      <motion.div
        className={`w-full h-full flex flex-col p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl relative overflow-hidden ${isSelected ? 'ring-4 ring-white/50' : ''}`}
        onClick={onSelect}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target className="w-24 h-24" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-4 h-4 text-indigo-100" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Daily Focus</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter tabular-nums">{hours}h {minutes}m</span>
          </div>
          <p className="text-xs text-indigo-100 mt-1 font-medium">Focused today</p>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-[10px] font-bold text-indigo-50">12% more than yesterday</span>
          </div>
        </div>
      </motion.div>
    </Resizable>
  );
}
