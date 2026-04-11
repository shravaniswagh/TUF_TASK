import { motion, AnimatePresence } from 'motion/react';
import { X, Type, Palette, ImageIcon, Layers, MoveUp, MoveDown, Trash2, Layout, Settings2, Sparkles, Clock, Check } from 'lucide-react';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

interface PinInspectorProps {
  pin: PinData | null;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

const FONTS = [
  { name: 'Modern Sans', value: 'system-ui' },
  { name: 'Vintage Type', value: "'Courier New', monospace" },
  { name: 'Playful Hand', value: "'Comic Sans MS', cursive" },
  { name: 'Elegant Serif', value: "'Georgia', serif" },
  { name: 'Digital Classic', value: "'Monaco', monospace" },
];

const FONT_SIZES = ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'];

const TEXT_COLORS = [
  { name: 'Classic', value: undefined },
  { name: 'Midnight', value: '#0f172a' },
  { name: 'Snow', value: '#ffffff' },
  { name: 'Electric', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
];

const CALENDAR_BG_COLORS = [
  '#FFFFFF', '#FFFBEB', '#FEF3C7', '#FDE68A',
  '#EFF6FF', '#DBEAFE', '#BFDBFE',
  '#FDF4FF', '#FAE8FF', '#F5D0FE',
  '#F0FDF4', '#DCFCE7', '#BBF7D0',
];

const CURVE_COLORS = [
  '#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#334155', '#0F172A',
];

export function PinInspector({ pin, onUpdate, onClose, onDelete, isDark }: PinInspectorProps) {
  if (!pin) return null;

  const handleUpdate = (updates: Partial<PinData>) => {
    onUpdate(pin.id, updates);
  };

  const accentColor = pin.color && pin.color !== 'transparent' ? pin.color : '#6366f1';

  const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-[14px] shadow-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
           <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</h3>
      </div>
      <div className="space-y-5 px-1">
        {children}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed top-0 right-0 bottom-0 w-[350px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-[32px] shadow-[-32px_0_64px_rgba(0,0,0,0.1)] border-l border-white/40 dark:border-slate-800/40 z-[2147483647] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Floating Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50 hover:bg-rose-500 hover:text-white rounded-[15px] transition-all transform hover:rotate-90 z-20 backdrop-blur-md"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header Space (Minimal for close btn) */}
      <div className="p-10 pb-2 shrink-0 h-24" />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6">
        
        {/* Visual Appearance */}
        <Section title="Style & Color" icon={Palette}>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-wide px-1">Pin Background</label>
              <div className="grid grid-cols-6 gap-2.5">
                {(pin.type === 'calendar' ? CALENDAR_BG_COLORS : THEME_CONFIG.pinPalette).map((color) => (
                  <button
                    key={color}
                    onClick={() => handleUpdate({ color })}
                    className={`w-full aspect-square rounded-[12px] border-2 transition-all hover:scale-110 flex items-center justify-center ${pin.color === color ? 'border-slate-900 dark:border-white shadow-xl scale-105' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  >
                    {pin.color === color && <Check className="w-3.5 h-3.5 mix-blend-difference text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {pin.type === 'stopwatch' && (
               <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-wide px-1">Clock Face Color</label>
                  <div className="grid grid-cols-6 gap-2.5">
                    {['#1a1a1a', '#000000', '#f8fafc', '#6366f1', '#f43f5e', '#10b981', '#f59e0b'].map((color) => (
                      <button
                        key={color}
                        onClick={() => handleUpdate({ itemColor: color })}
                        className={`w-full aspect-square rounded-[12px] border-2 transition-all hover:scale-110 flex items-center justify-center ${pin.itemColor === color ? 'border-slate-900 dark:border-white shadow-xl scale-105' : 'border-transparent shadow-sm'}`}
                        style={{ backgroundColor: color }}
                      >
                        {pin.itemColor === color && <Check className="w-3.5 h-3.5 mix-blend-difference text-white" />}
                      </button>
                    ))}
                  </div>
               </div>
            )}
          </div>
        </Section>

        {/* Typography */}
        {(['note', 'todo', 'countdown', 'clock', 'stopwatch', 'focus-summary', 'weekly-analysis'].includes(pin.type)) && (
          <Section title="Typography" icon={Type}>
            <div className="space-y-6">
               <div className="grid grid-cols-1 gap-2">
                 {FONTS.map((font) => (
                   <button
                     key={font.value}
                     onClick={() => handleUpdate({ fontFamily: font.value })}
                     className={`w-full px-5 py-3 text-sm text-left rounded-2xl border transition-all flex items-center justify-between ${pin.fontFamily === font.value ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                     style={{ fontFamily: font.value }}
                   >
                     <span>{font.name}</span>
                     {pin.fontFamily === font.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                   </button>
                 ))}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 block px-1 uppercase tracking-wide">Size</label>
                    <select 
                      value={pin.fontSize || '16px'}
                      onChange={(e) => handleUpdate({ fontSize: e.target.value })}
                      className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold appearance-none cursor-pointer shadow-sm hover:border-slate-200"
                    >
                      {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 block px-1 uppercase tracking-wide">Accent</label>
                   <div className="grid grid-cols-6 gap-2">
                        {THEME_CONFIG.pinPalette.map(color => (
                           <button 
                             key={color} 
                             onClick={() => handleUpdate({ textColor: color })}
                             className={`aspect-square rounded-[10px] border-2 flex items-center justify-center transition-all ${pin.textColor === color ? 'border-slate-900 shadow-md scale-105' : 'border-black/5 hover:border-black/20'}`}
                             style={{ backgroundColor: color }}
                           >
                              <Type className="w-3.5 h-3.5 mix-blend-difference invert opacity-60" />
                           </button>
                        ))}
                    </div>
                  </div>
               </div>
            </div>
          </Section>
        )}

        {/* Content Specifics */}
        {(pin.type === 'calendar') && (
          <Section title="Structure" icon={Layout}>
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 block px-1 uppercase tracking-wide">Line Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {CURVE_COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => handleUpdate({ curveColor: color })}
                        className={`w-8 h-8 rounded-xl transition-all hover:scale-110 flex items-center justify-center ${pin.curveColor === color ? 'ring-2 ring-offset-2 ring-slate-900' : 'shadow-sm'}`}
                        style={{ backgroundColor: color }}
                      >
                         {pin.curveColor === color && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          </Section>
        )}

        {/* Layer Management */}
        <Section title="Management" icon={Layers}>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleUpdate({ zIndex: Date.now() })}
              className="group flex items-center justify-center gap-2.5 px-4 py-4 bg-slate-900 text-white rounded-[20px] transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-slate-900/10 text-xs font-black uppercase tracking-widest"
            >
              <MoveUp className="w-3.5 h-3.5" />
              Top
            </button>
            <button 
              onClick={() => onDelete(pin.id)}
              className="flex items-center justify-center gap-2.5 px-4 py-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-[20px] transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 border border-rose-100 text-xs font-black uppercase tracking-widest"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </Section>
      </div>

      {/* Persistence Note */}
      <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100/50 dark:border-slate-800/50 pointer-events-none">
        <div className="flex items-center justify-center gap-2">
           <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
           <p className="text-[9px] text-center text-slate-400 uppercase tracking-[0.2em] font-black">
             Syncing to silk cloud
           </p>
        </div>
      </div>
    </motion.div>
  );
}
