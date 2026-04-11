import { motion } from 'motion/react';
import { Resizable } from 're-resizable';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { PinData } from './Pin';

interface WeeklyAnalysisPinProps {
  pin: PinData;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  isDark: boolean;
  isLocked: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  weeklyData: { day: string; hours: number }[];
}

export function WeeklyAnalysisPin({ 
  pin, onUpdate, onDelete, onDragStart, isDragging, isDark, isLocked, isSelected, onSelect, weeklyData 
}: WeeklyAnalysisPinProps) {
  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _dir, _ref, d) => {
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
        className={`w-full h-full flex flex-col p-6 rounded-3xl bg-white dark:bg-[#1a1a1a] shadow-2xl relative border border-slate-200 dark:border-white/5 ${isSelected ? 'ring-4 ring-indigo-500/50' : ''}`}
        onClick={onSelect}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Weekly Performance</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-md">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500">+1.2h</span>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }}
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

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Total this week</span>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">22.5 Hours</span>
        </div>
      </motion.div>
    </Resizable>
  );
}
