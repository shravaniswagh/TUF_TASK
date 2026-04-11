import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Resizable } from 're-resizable';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { BarChart3, GripVertical, X, Settings2, Target } from 'lucide-react';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

interface WeeklyAnalysisPinProps {
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
  weeklyData: { day: string; hours: number }[];
  focusHistory?: Record<string, Record<string, number>>;
  allPins?: PinData[];
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

export function WeeklyAnalysisPin({ 
  pin, onUpdate, onDelete, onDragStart, onOpenInspector, isDragging, isDark, isLocked, isSelected, onSelect, onBringToFront, weeklyData, focusHistory = {}, allPins = [] 
}: WeeklyAnalysisPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pinHeadColor = PIN_HEAD_COLORS[pin.type] || '#6366F1';
  const defaultBg = isDark ? '#1a1a1a' : '#f8fafc';
  const bgColor = pin.color || defaultBg;
  const textColorClass = getContrastColor(bgColor);

  const totalHours = weeklyData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);

  // Derive task breakdown for the week
  const taskStats = useMemo(() => {
    const stats: Record<string, { seconds: number; name: string; color: string }> = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    Object.entries(focusHistory).forEach(([date, breakdown]) => {
      if (new Date(date) >= oneWeekAgo) {
        Object.entries(breakdown).forEach(([taskId, seconds]) => {
          if (!stats[taskId]) {
            // Find task name and color from all pins
            let taskName = 'Unknown Task';
            let taskColor = '#64748b';

            allPins.forEach(p => {
              if (p.type === 'todo' || p.type === 'daily-tasks') {
                try {
                  const todos = JSON.parse(p.content || '[]');
                  const task = todos.find((t: any) => t.id === taskId);
                  if (task) {
                    taskName = task.text;
                    taskColor = p.color || '#6366f1';
                  }
                } catch(e) {}
              }
            });

            stats[taskId] = { seconds: 0, name: taskName, color: taskColor };
          }
          stats[taskId].seconds += seconds;
        });
      }
    });

    return Object.entries(stats)
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .slice(0, 6); // Top 6 tasks
  }, [focusHistory, allPins]);

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _dir, _ref, d) => {
        if (isLocked) return;
        onUpdate(pin.id, { width: pin.width + d.width, height: pin.height + d.height });
      }}
      minWidth={300}
      minHeight={250}
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        zIndex: isDragging ? 9999 : (pin.zIndex ?? 1),
      }}
    >
      <motion.div
        className={`w-full h-full flex flex-col rounded-xl transition-all duration-300 ${isSelected ? 'shadow-2xl scale-[1.01]' : ''}`}
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
            <span className={`text-[10px] font-black uppercase tracking-widest ${textColorClass}`}>Focus Analytics</span>
          </div>
          
          <div className="flex items-center gap-1">
            <AnimatePresence>
              {isHovered && !isLocked && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
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

        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${textColorClass}`}>Weekly Performance</span>
            </div>
          </div>

          <div className="w-full h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-bold shadow-2xl border border-white/10">
                          {payload[0].value} hours
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={24}>
                  {weeklyData.map((_entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === weeklyData.length - 1 ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aesthetic Task Legend */}
          {taskStats.length > 0 && (
            <div className="mt-8 space-y-3">
               <div className="flex items-center gap-2 mb-4">
                  <Target className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Top Focused Tasks</span>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  {taskStats.map(([id, stat]) => (
                    <div key={id} className="flex items-center justify-between group">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                          <span className={`text-[11px] font-bold truncate opacity-70 group-hover:opacity-100 transition-opacity ${textColorClass}`}>{stat.name}</span>
                       </div>
                       <span className={`text-[10px] font-black tabular-nums opacity-40 ${textColorClass}`}>
                          {(stat.seconds / 3600).toFixed(1)}h
                       </span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className={`mt-auto pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'} flex items-center justify-between shrink-0`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${textColorClass}`}>Total Capacity</span>
            <span className={`text-sm font-black ${textColorClass}`}>{totalHours} Hours</span>
          </div>
        </div>
      </div>
    </motion.div>
    </Resizable>
  );
}
