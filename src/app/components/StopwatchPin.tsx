import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Resizable } from 're-resizable';
import { X, GripVertical, Play, Pause, RotateCcw, Maximize2, Minimize2, Settings2, ListTodo, Circle, CheckCircle2, Square } from 'lucide-react';
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
  onOpenInspector: (id: string) => void;
  onBringToFront: (id: string) => void;
  onToggleFullscreen?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
  onToggleFocus?: (taskId: string | null) => void;
  activeTaskId?: string | null;
  activeTaskName?: string | null;
  activeTaskColor?: string | null;
  onFocusIncrement?: (taskId?: string | null) => void;
  allPins?: PinData[];
}

const PIN_HEAD_COLORS: Record<string, string> = THEME_CONFIG.pinHeads;

function getContrastColor(hexColor?: string) {
  if (!hexColor || hexColor === 'transparent') return 'text-slate-600';
  const hex = hexColor.replace('#', '');
  let fullHex = hex;
  if (hex.length === 3) fullHex = hex.split('').map(c => c + c).join('');
  if (fullHex.length !== 6) return 'text-slate-600'; 
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? 'text-slate-600' : 'text-white';
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function StopwatchPin({ 
  pin, onUpdate, onDelete, onDragStart, isDragging = false, isDark, isLocked, isSelected, onSelect, onOpenInspector, onBringToFront, 
  onToggleFullscreen, isFullscreen = false, onToggleFocus, activeTaskId, activeTaskName, activeTaskColor, onFocusIncrement, allPins = [] 
}: StopwatchPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(() => {
    if (!pin.isPaused && pin.startTime) {
      const elapsed = Math.floor((Date.now() - pin.startTime) / 1000);
      return (pin.totalSeconds || 0) + elapsed;
    }
    return pin.totalSeconds || 0;
  });
  const [selectorPos, setSelectorPos] = useState({ top: 0, left: 0, width: 256 });
  const selectorBtnRef = useRef<HTMLButtonElement>(null);

  // Update position when selector opens
  useEffect(() => {
    if (showTaskSelector && selectorBtnRef.current) {
      const rect = selectorBtnRef.current.getBoundingClientRect();
      setSelectorPos({
        top: rect.top - 8,
        left: rect.right - 256,
        width: 256
      });
    }
  }, [showTaskSelector]);
  
  useEffect(() => {
    setLocalSeconds(pin.totalSeconds || 0);
  }, [pin.totalSeconds]);

  // Display Ticker (Smoother UI updates, NO periodic DB saves)
  useEffect(() => {
    let interval: any;
    const updateLocalTime = () => {
      if (!pin.isPaused && pin.startTime) {
        const elapsedSinceStart = Math.floor((Date.now() - pin.startTime!) / 1000);
        setLocalSeconds((pin.totalSeconds || 0) + elapsedSinceStart);
      } else {
        setLocalSeconds(pin.totalSeconds || 0);
      }
    };

    updateLocalTime(); // Run once immediately to prevent flicker
    
    if (!pin.isPaused && pin.startTime) {
      interval = setInterval(updateLocalTime, 1000);
    }
    return () => clearInterval(interval);
  }, [pin.isPaused, pin.startTime, pin.totalSeconds]);

  // Task Switch Flush: If the user changes the active task while running, 
  // we MUST log the progress to the PREVIOUS task before starting the new one.
  const prevTaskIdRef = useRef(activeTaskId);
  useEffect(() => {
    if (prevTaskIdRef.current !== activeTaskId) {
      if (!pin.isPaused && pin.startTime) {
        const sessionSeconds = Math.floor((Date.now() - pin.startTime) / 1000);
        if (sessionSeconds > 0 && prevTaskIdRef.current) {
          // Log to previous task
          onFocusIncrement?.(prevTaskIdRef.current, sessionSeconds);
        }
        // Start new session timestamp for the new task
        onUpdate(pin.id, { 
          totalSeconds: (pin.totalSeconds || 0) + sessionSeconds,
          startTime: Date.now() 
        });
      }
      prevTaskIdRef.current = activeTaskId;
    }
  }, [activeTaskId, pin.isPaused, pin.startTime, pin.totalSeconds, onFocusIncrement, pin.id, onUpdate]);

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
    const isPausing = !pin.isPaused;
    if (isPausing) {
      // Logic for PAUSING:
      // Calculate final elapsed time and save it to totalSeconds
      const sessionSeconds = pin.startTime ? Math.floor((Date.now() - pin.startTime) / 1000) : 0;
      const newTotal = (pin.totalSeconds || 0) + sessionSeconds;
      
      onUpdate(pin.id, { 
        isPaused: true, 
        totalSeconds: newTotal,
        startTime: undefined 
      });
      
      // Log the remaining seconds to analytics
      if (sessionSeconds > 0 && activeTaskId) {
        onFocusIncrement?.(activeTaskId, sessionSeconds);
      }
    } else {
      // Logic for STARTING:
      // Set the startTime to NOW
      onUpdate(pin.id, { 
        isPaused: false, 
        startTime: Date.now() 
      });
    }
  };

  const handleReset = () => {
    onUpdate(pin.id, { totalSeconds: 0, startTime: undefined, isPaused: true });
    setLocalSeconds(0);
  };

  const handleStop = () => {
    // Calculate if there was any time running in the current session
    const sessionSeconds = (!pin.isPaused && pin.startTime) ? Math.floor((Date.now() - pin.startTime) / 1000) : 0;
    
    // Log ONLY the current session's duration to analytics
    // (Previous segments were already logged when paused/switched)
    if (sessionSeconds > 0 && activeTaskId) {
      onFocusIncrement?.(activeTaskId, sessionSeconds);
    }

    onUpdate(pin.id, { totalSeconds: 0, isPaused: true, startTime: undefined });
    setLocalSeconds(0);
  };

  const pinHeadColor = PIN_HEAD_COLORS[pin.type] || '#6366F1';
  const defaultBg = isDark ? '#1a1a1a' : '#f8fafc';
  const bgColor = pin.color || (isFullscreen ? (isDark ? '#0a0a0a' : '#ffffff') : defaultBg);
  const textColorClass = getContrastColor(bgColor);
  
  const clockTextColor = pin.textColor || (textColorClass === 'text-white' ? '#ffffff' : '#1e293b');
  const customFont = pin.fontFamily || 'Inter, system-ui, sans-serif';
  const timeFontSize = isFullscreen ? 'text-9xl' : (pin.width > 300 ? 'text-6xl' : 'text-4xl');

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'absolute',
        inset: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : pin.x,
        top: isFullscreen ? 0 : pin.y,
        zIndex: isFullscreen ? 10000 : (isSelected ? 1000 : (pin.zIndex ?? 1)),
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
        minHeight={isFullscreen ? 0 : 200}
        className="w-full h-full"
      >
        <motion.div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setShowTaskSelector(false); }}
          className={`w-full h-full flex flex-col relative transition-all duration-500 ${isSelected ? 'shadow-2xl' : ''} ${isDragging ? 'opacity-50' : ''} ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
          onClick={() => {
            if (!isFullscreen) {
              onSelect();
              onBringToFront(pin.id);
            }
          }}
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

          <div className={`w-full h-full flex flex-col overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}>
            {!isFullscreen && (
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
                    <span className={`text-xs capitalize tracking-wide font-medium ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`}>Stopwatch</span>
                  </div>
                
                <div className="flex items-center gap-1.5">
                   <AnimatePresence>
                      {isHovered && !isLocked && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex gap-1.5">
                          <button
                            ref={selectorBtnRef}
                            onClick={(e) => { e.stopPropagation(); setShowTaskSelector(!showTaskSelector); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all ${showTaskSelector ? 'bg-indigo-500 text-white shadow-lg' : ''}`}
                            title="Select Task"
                          >
                            <ListTodo className={`w-3.5 h-3.5 ${showTaskSelector ? 'text-white' : (clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600')}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFullscreen?.(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all"
                          >
                            <Maximize2 className={`w-3.5 h-3.5 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenInspector(pin.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all"
                          >
                            <Settings2 className={`w-3.5 h-3.5 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`} />
                          </button>
                        </motion.div>
                      )}
                   </AnimatePresence>
                   {!isLocked && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl hover:bg-rose-500 hover:text-white transition-all group`}
                    >
                      <X className={`w-3.5 h-3.5 ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-500'} group-hover:text-white`} />
                    </button>
                   )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center relative -mt-2">
              {isFullscreen && (
                  <button 
                     onClick={() => onToggleFullscreen?.(false)}
                     className={`absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl transition-all border border-black/5 z-[10001] group ${clockTextColor === '#ffffff' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                   >
                     <Minimize2 className={`w-5 h-5 transition-opacity ${clockTextColor === '#ffffff' ? 'text-white' : 'text-slate-600'}`} />
                  </button>
               )}

              <div 
                 className={`${timeFontSize} font-black tracking-tighter tabular-nums`}
                 style={{ color: clockTextColor, fontFamily: customFont }}
              >
                {formatTime(localSeconds)}
              </div>

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
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20">
                     {pin.isPaused ? (
                       <Play className={isFullscreen ? "w-10 h-10 ml-1.5" : "w-6 h-6 ml-1"} fill="currentColor" />
                     ) : (
                       <Pause className={isFullscreen ? "w-10 h-10" : "w-6 h-6"} fill="currentColor" />
                     )}
                  </div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleStop(); }}
                  className={`flex items-center justify-center transition-all hover:scale-110 active:scale-90`}
                  style={{ color: clockTextColor }}
                  title="Stop"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10">
                    <Square className={isFullscreen ? "w-8 h-8" : "w-5 h-5"} fill="currentColor" />
                  </div>
                </button>

                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showTaskSelector && (
                      <>
                        <div 
                          className="fixed inset-0 z-[1000000]" 
                          onClick={(e) => { e.stopPropagation(); setShowTaskSelector(false); }}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          style={{ 
                            position: 'fixed',
                            top: selectorPos.top,
                            left: selectorPos.left,
                            width: selectorPos.width,
                            zIndex: 1000001
                          }}
                          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Active Task</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live Syncing</span>
                            </div>
                          </div>
                          
                          <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
                            {availableTasks.length > 0 ? (
                              <div className="space-y-1">
                                {availableTasks.map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFocus?.(t.id);
                                      setShowTaskSelector(false);
                                    }}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group ${
                                      activeTaskId === t.id 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                    }`}
                                  >
                                    <div className="relative">
                                      {activeTaskId === t.id ? (
                                        <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                      )}
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className={`text-xs font-bold truncate ${
                                        activeTaskId === t.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'
                                      }`}>
                                        {t.text}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.parentColor }} />
                                        <span className="text-[9px] text-slate-400 font-medium">From Board</span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 px-4 text-center">
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <ListTodo className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 leading-tight">No Active Tasks Found</p>
                                <p className="text-[9px] text-slate-400 mt-1">Create a To-Do pin to start tracking goals</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>,
                  document.body
                )}

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
          </div>
        </motion.div>
      </Resizable>
    </div>
  );
}
