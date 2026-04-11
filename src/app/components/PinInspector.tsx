import { motion, AnimatePresence } from 'motion/react';
import { X, Type, Palette, ImageIcon, Layers, MoveUp, MoveDown, Trash2, Layout, Settings2, Sparkles } from 'lucide-react';
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
  { name: 'Default', value: 'system-ui' },
  { name: 'Typewriter', value: "'Courier New', monospace" },
  { name: 'Playful', value: "'Comic Sans MS', cursive" },
  { name: 'Elegant', value: "'Georgia', serif" },
  { name: 'Handwritten', value: "'Brush Script MT', cursive" },
];

const FONT_SIZES = ['12px', '14px', '16px', '20px', '24px', '32px'];

const TEXT_COLORS = [
  { name: 'Auto', value: undefined },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Indigo', value: '#6366F1' },
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

  const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-4 right-4 bottom-4 w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 dark:border-slate-800/50 z-[2147483647] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">PIN SETTINGS</h2>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
            {pin.type.replace('-', ' ')} #{pin.id.split('-').pop()}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all group"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2">
        
        {/* Appearance Section */}
        <Section title="Appearance" icon={Palette}>
          <div className="space-y-4">
            {/* Body Color */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Background Palette</label>
              <div className="grid grid-cols-6 gap-2">
                {(pin.type === 'calendar' ? CALENDAR_BG_COLORS : THEME_CONFIG.pinPalette).map((color) => (
                  <button
                    key={color}
                    onClick={() => handleUpdate({ color })}
                    className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-125 ${pin.color === color ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Text Color (Notes/Todo/Countdown) */}
            {(['note', 'todo', 'countdown', 'clock'].includes(pin.type)) && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Text Accent</label>
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleUpdate({ textColor: c.value })}
                      className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${pin.textColor === c.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-slate-800'}`}
                      style={{ color: c.value || (isDark ? '#fff' : '#000') }}
                      title={c.name}
                    >
                      <Type className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Typography Section */}
        {(['note', 'todo', 'countdown', 'clock'].includes(pin.type)) && (
          <Section title="Typography" icon={Type}>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Font Family</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {FONTS.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleUpdate({ fontFamily: font.value })}
                      className={`w-full px-4 py-2 text-sm text-left rounded-xl transition-all ${pin.fontFamily === font.value ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Size</label>
                  <select 
                    value={pin.fontSize || '16px'}
                    onChange={(e) => handleUpdate({ fontSize: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  >
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Image / Calendar Content Section */}
        {(pin.type === 'image' || pin.type === 'calendar') && (
          <Section title="Content Layout" icon={Layout}>
            <div className="space-y-4">
              {pin.type === 'image' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Image Fit</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cover', 'contain', 'fill'].map((fit) => (
                      <button
                        key={fit}
                        onClick={() => handleUpdate({ imageObjectFit: fit as any })}
                        className={`px-3 py-2 text-[10px] font-bold uppercase rounded-lg border-2 transition-all ${pin.imageObjectFit === fit ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {pin.type === 'calendar' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Curve Accent</label>
                    <div className="flex flex-wrap gap-2">
                      {CURVE_COLORS.map(color => (
                        <button 
                          key={color}
                          onClick={() => handleUpdate({ curveColor: color })}
                          className={`w-6 h-6 rounded-lg transition-transform hover:scale-125 ${pin.curveColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 border-2 border-white dark:border-slate-800' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 block">Header Image URL</label>
                    <input 
                      type="text"
                      value={pin.headerImage || ''}
                      onChange={(e) => handleUpdate({ headerImage: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </>
              )}
            </div>
          </Section>
        )}

        {/* Management Section */}
        <Section title="Management" icon={Layers}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleUpdate({ zIndex: Date.now() })}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-2xl transition-all border border-slate-100 dark:border-slate-800 text-xs font-bold"
              >
                <MoveUp className="w-3.5 h-3.5" />
                To Front
              </button>
              <button 
                onClick={() => onDelete(pin.id)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 rounded-2xl transition-all border border-rose-100 dark:border-rose-900/20 text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 pointer-events-none">
        <p className="text-[9px] text-center text-slate-400 uppercase tracking-widest font-bold">
          Changes are saved automatically to cloud
        </p>
      </div>
    </motion.div>
  );
}
