import { useState, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { X, GripVertical, Play, Pause, RotateCcw, Maximize2, Minimize2, Settings2, ListTodo, Circle, CheckCircle2 } from 'lucide-react';
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
  onBringToFront: (id: string) => void;
  activeTaskId?: string | null;
  activeTaskName?: string | null;
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

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
}

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, onOpenInspector, onToggleFullscreen, isFullscreen = false, isDragging, isDark, isLocked, isSelected, onSelect, activeTaskId, activeTaskName, onFocusIncrement, onToggleFocus, onBringToFront, allPins = [] 
}: StopwatchPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(pin.totalSeconds || 0);
  
  // Keep local seconds in sync with external updates (like reset)
  useEffect(() => {
    setLocalSeconds(pin.totalSeconds || 0);
  }, [pin.totalSeconds]);

  useEffect(() => {
    let interval: any;
    if (!pin.isPaused) {
      interval = setInterval(() => {
        setLocalSeconds(s => {
          const next = s + 1;
          onUpdate(pin.id, { totalSeconds: next });
          onFocusIncrement?.();
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pin.isPaused, pin.id, onUpdate, onFocusIncrement]);

  // Derive incomplete tasks from all pins
  const availableTasks = allPins.flatMap(p => {
    if (p.type === 'todo' || p.type === 'daily-tasks') {
      try {
        const todos = JSON.parse(p.content || '[]');
        return todos.filter((t: any) => !t.completed).map((t: any) => ({
          ...t,
          parentColor: p.color || '#6366f1'
        }));
      } catch (e) { return []; }
    }
    return [];
  });

  const handleToggle = () => {
    onUpdate(pin.id, { isPaused: !pin.isPaused });
  };

  const handleReset = () => {
    onUpdate(pin.id, { totalSeconds: 0, isPaused: true });
    setLocalSeconds(0);
  };

  const pinHeadColor = PIN_HEAD_COLORS[pin.type] || '#6366F1';
  const defaultBg = isDark ? '#1a1a1a' : '#f8fafc';
  const bgColor = isFullscreen ? '#0a0a0a' : (pin.color || defaultBg);
  const textColorClass = getContrastColor(bgColor);
  
  const clockTextColor = pin.textColor || (textColorClass.includes('slate-50') ? '#ffffff' : '#1e293b');
  const customFont = pin.fontFamily || 'Inter, system-ui, sans-serif';

  // Responsive scaling factor - based on clock style
  const timeFontSize = isFullscreen ? 'text-9xl' : (pin.width > 300 ? 'text-6xl' : 'text-4xl');

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'absolute',
        inset: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : pin.x,
        top: isFullscreen ? 0 : pin.y,
        zIndex: isFullscreen ? 10000 : (isDragging ? 1000 : (pin.zIndex ?? 1)),
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
        minWidth={isFullscreen ? 0 : 220}
        minHeight={isFullscreen ? 0 : 150}
        className="w-full h-full"
      >
        <motion.div
          className={`w-full h-full flex flex-col relative transition-all duration-500 ${isSelected ? 'shadow-2xl' : ''} ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
          onClick={() => {
            onSelect();
            onBringToFront(pin.id);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setShowTaskSelector(false); }}
          style={{
            backgroundColor: bgColor,
            boxShadow: isFullscreen ? 'none' : (isSelected ? '0 32px 64px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.07)'),
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {!isFullscreen && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="w-5 h-5 rounded-full shadow-md" style={{ backgroundColor: pinHeadColor }} />
              <div className="w-1.5 h-2 rounded-b-sm mx-auto" style={{ backgroundColor: pinHeadColor, opacity: 0.6 }} />
            </div>
          )}

          {/* Internal Content Wrapper to fix clipping */}
          <div className={`w-full h-full flex flex-col overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}>
            {!isFullscreen && (
              <div
                onMouseDown={(e) => {
                  if (isLocked) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onDragStart(pin.id, e);
                }}
                className="flex items-center justify-between px-5 pt-5 pb-0 cursor-grab active:cursor-grabbing shrink-0"
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
            )}

            {/* Main Display Content - Matching Clock Layout */}
            <div className="flex-1 flex flex-col items-center justify-center relative -mt-2">
              {isFullscreen && (
                 <button 
                    onClick={() => onToggleFullscreen?.(false)}
                    className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 backdrop-blur-xl z-[10001] group"
                  >
                    <Minimize2 className="w-5 h-5 text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                 </button>
              )}

              <div 
                 className={`${timeFontSize} font-black tracking-tighter tabular-nums`}
                 style={{ color: clockTextColor, fontFamily: customFont }}
              >
                {formatTime(localSeconds)}
              </div>

              {/* Controls - Replacing the Date area of clock */}
              <div className={`flex items-center gap-6 mt-4 opacity-50 hover:opacity-100 transition-opacity z-10`}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className={`flex items-center justify-center transition-all hover:scale-110 active:scale-90`}
                  style={{ color: clockTextColor }}
                  title="Reset"
                >
                   <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10">
                      <RotateCcw className={isFullscreen ? "w-8 h-8" : "w-5 h-5"} />
                   </div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                  className={`flex items-center justify-center transition-all hover:scale-110 active:scale-90`}
                  style={{ color: clockTextColor }}
                  title={pin.isPaused ? "Play" : "Pause"}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10">
                     {pin.isPaused ? (
                       <Play className={isFullscreen ? "w-10 h-10 ml-1.5" : "w-6 h-6 ml-1"} fill="currentColor" />
                     ) : (
                       <Pause className={isFullscreen ? "w-10 h-10" : "w-6 h-6"} fill="currentColor" />
                     )}
                  </div>
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowTaskSelector(!showTaskSelector); }}
                    className={`flex items-center justify-center transition-all hover:scale-110 active:scale-90`}
                    style={{ color: clockTextColor }}
                    title="Select Task"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10">
                      <ListTodo className={isFullscreen ? "w-8 h-8" : "w-5 h-5"} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {showTaskSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-3 right-0 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 p-3 max-h-64 overflow-y-auto custom-scrollbar z-[100]"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Select Focus Task</p>
                        <div className="space-y-1">
                          {availableTasks.length === 0 ? (
                             <div className="px-3 py-4 text-center text-xs text-slate-400 italic">No active tasks found.</div>
                          ) : availableTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFocus?.(task.id);
                                setShowTaskSelector(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeTaskId === task.id ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}
                            >
                              <div className="w-4 h-4 flex-shrink-0" style={{ color: activeTaskId === task.id ? 'white' : task.parentColor }}>
                                 {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                              </div>
                              <span className="text-sm font-bold truncate text-left">{task.text}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {isFullscreen && activeTaskName && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-20 text-center"
                >
                  <p className="text-white/30 uppercase font-black tracking-[0.4em] text-xs mb-2">Focusing On</p>
                  <h2 className="text-white text-3xl font-black tracking-tight">{activeTaskName}</h2>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </Resizable>
    </div>
  );
}
