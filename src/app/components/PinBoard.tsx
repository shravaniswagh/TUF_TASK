import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Pin, PinData } from './Pin';
import { CalendarPin } from './CalendarPin';
import { PinInspector } from './PinInspector';
import { StopwatchPin } from './StopwatchPin';
import { FocusSummaryPin } from './FocusSummaryPin';
import { WeeklyAnalysisPin } from './WeeklyAnalysisPin';
import { THEME_CONFIG } from '../theme-config';
import {
  Plus,
  Copy,
  LogOut,
  Sun,
  Moon,
  StickyNote,
  Calendar,
  Image as ImageIcon,
  CalendarDays,
  ListTodo,
  ClipboardList,
  Check,
  ChevronLeft,
  Palette,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Clock,
  Timer,
  BarChart3,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

/**
 * Robust Adaptive Grid Contrast Engine
 */
function getAdaptiveDotColor(bgColor: string | null, isDark: boolean) {
  if (!bgColor) {
    return isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  }
  try {
    const hex = bgColor.replace('#', '');
    let h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.45 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)';
  } catch {
    return isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  }
}

export function PinBoard({ boardId }: { boardId: string }) {
  const [pins, setPins] = useState<PinData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'theme' | 'clear-confirm'>('main');
  const [clearConfirmInput, setClearConfirmInput] = useState('');
  const [boardColor, setBoardColor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [inspectorPinId, setInspectorPinId] = useState<string | null>(null);
  const [fullscreenPinId, setFullscreenPinId] = useState<string | null>(null);
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [focusHistory, setFocusHistory] = useState<Record<string, Record<string, number>>>({}); // Date -> TaskID -> Time
  const [maxZ, setMaxZ] = useState(100);
  const boardRef = useRef<HTMLDivElement>(null);

  // Derive weekly data from real focus history
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dailySeks = Object.values(focusHistory[dateStr] || {}).reduce((sum, val) => sum + val, 0);
      result.push({
        day: days[d.getDay()],
        hours: Number((dailySeks / 3600).toFixed(1))
      });
    }
    return result;
  }, [focusHistory]);

  const dailyTotal = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    return Object.values(focusHistory[today] || {}).reduce((sum, val) => sum + val, 0);
  }, [focusHistory]);
  const [copied, setCopied] = useState(false);
  const prevBoardIdRef = useRef(boardId);
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('board-locked') === 'true';
    }
    return false;
  });

  // ── FAIL-SAFE MANUAL THEME ENGINE ────────────────────────────
  // We bypass next-themes for the board rendering to prevent OS interference.
  const [manualTheme, setManualTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('board-theme-forced') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const isDark = manualTheme === 'dark';

  // 1. Sync mounted state for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. FORCE SYSTEM LOCK: Manually synchronize DOM classes and body backgrounds
  // This is the CRITICAL 'fail-safe' that ensures the UI follows manualTheme strictly.
  useLayoutEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      body.style.backgroundColor = THEME_CONFIG.backgrounds.dark;
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      body.style.backgroundColor = THEME_CONFIG.backgrounds.light;
    }
    
    // Sync to local storage for instant head-script read on next load
    localStorage.setItem('board-theme-forced', manualTheme);
    localStorage.setItem('theme', manualTheme); // Also sync with next-themes if it exists
  }, [manualTheme, mounted, isDark]);

  // Derived Active Task Info for all components
  const activeTaskInfo = useMemo(() => {
    if (!activeFocusTaskId) return null;
    for (const p of pins) {
      if (p.type === 'todo' || p.type === 'daily-tasks') {
        try {
          const todos = JSON.parse(p.content || '[]');
          const t = todos.find((t: any) => t.id === activeFocusTaskId);
          if (t) return { text: t.text, color: t.color || p.color };
        } catch (e) {}
      }
    }
    return null;
  }, [pins, activeFocusTaskId]);

  /* ── Load & Sync ─────────────────────────────────────────────── */
  useEffect(() => {
    const fetchPins = async () => {
      if (prevBoardIdRef.current !== boardId) {
        setHasLoaded(false);
        prevBoardIdRef.current = boardId;
      }
      try {
        const docSnap = await getDoc(doc(db, 'boards', boardId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pins) setPins(data.pins);
          if (data.boardBackgroundColor) setBoardColor(data.boardBackgroundColor);
          if (data.theme) setManualTheme(data.theme);
          if (data.isLocked !== undefined) setIsLocked(data.isLocked);
          if (data.focusHistory) setFocusHistory(data.focusHistory);
          if (data.activeFocusTaskId) {
            setActiveFocusTaskId(data.activeFocusTaskId);
            masterStateRef.current.activeFocusTaskId = data.activeFocusTaskId;
          }
        }
        setHasLoaded(true);
      } catch (err) {
        console.error('Fetch error:', err);
        setHasLoaded(true);
      }
    };
    fetchPins();
  }, [boardId]);

  // ── Synchronous Master State Cache (Race-Condition Shield) ──────
  // We maintain a synchronous ref that mirrors our state instantly.
  // This ensures beforeunload always sees the absolute latest data,
  // even if React hasn't finished its async render cycle yet.
  const masterStateRef = useRef({ 
    pins, boardColor, manualTheme, isLocked, focusHistory, hasLoaded, activeFocusTaskId 
  });

  // Sync ref on every render as a backup
  useEffect(() => {
    masterStateRef.current = { pins, boardColor, manualTheme, isLocked, focusHistory, hasLoaded, activeFocusTaskId };
  }, [pins, boardColor, manualTheme, isLocked, focusHistory, hasLoaded, activeFocusTaskId]);

  const doSave = useCallback(() => {
    const { pins: p, boardColor: bc, manualTheme: mt, isLocked: il, focusHistory: fh, hasLoaded: hl, activeFocusTaskId: af } = masterStateRef.current;
    if (!hl) return;

    const cleaned = p.map(pin => {
      const c: any = {};
      Object.entries(pin).forEach(([k, v]) => { if (v !== undefined) c[k] = v; });
      return c;
    });

    console.log('[SAVE] 💾 Syncing workspace to cloud...');
    setDoc(doc(db, 'boards', boardId), {
      pins: cleaned,
      boardBackgroundColor: bc,
      theme: mt,
      isLocked: il,
      lastUpdated: new Date().toISOString(),
      focusHistory: fh,
      activeFocusTaskId: af,
    }, { merge: true })
      .then(() => console.log('[SAVE] ✅ Success: Workspace persistent.'))
      .catch((err) => console.error('[SAVE] ❌ Error: Cloud sync failed:', err));
  }, [boardId]);

  // Default Debounced Save (500ms) - now reads from MASTER REF
  useEffect(() => {
    if (!hasLoaded) return;
    const timer = setTimeout(doSave, 500);
    return () => clearTimeout(timer);
  }, [pins, hasLoaded, boardColor, manualTheme, isLocked, focusHistory, doSave]);

  // Fail-Safe: Flush on Page Refresh or Unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      doSave(); // Synchronously reads the latest from masterStateRef
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      doSave(); 
    };
  }, [doSave]);

  /* ── Interaction Handlers ───────────────────────────────────── */
  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    if (isLocked) return;
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    setDragging({ id, offsetX: e.clientX - pin.x, offsetY: e.clientY - pin.y });
  }, [pins, isLocked]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || isLocked) return;
    setPins(prev => prev.map(p =>
      p.id === dragging.id
        ? { ...p, x: e.clientX - dragging.offsetX, y: e.clientY - dragging.offsetY }
        : p
    ));
  }, [dragging, isLocked]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const bringToFront = useCallback((id: string) => {
    setPins(prev => prev.map(p => p.id === id ? { ...p, zIndex: maxZ + 1 } : p));
    setMaxZ(z => z + 1);
  }, [maxZ]);

  const findSafePosition = (w: number, h: number) => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const padding = 60;
    let x = screenWidth - w - 80;
    let y = 100;

    const isColliding = (tx: number, ty: number) => {
      return pins.some(p => {
        return !(tx + w < p.x || tx > p.x + p.width || ty + h < p.y || ty > p.y + p.height);
      });
    };

    let attempts = 0;
    while (isColliding(x, y) && attempts < 30) {
      y += 80;
      if (y > 700) {
        y = 100;
        x -= (w + 40);
      }
      if (x < padding) break;
      attempts++;
    }

    return { x, y };
  };

  const addPin = (type: PinData['type']) => {
    const maxZ = pins.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
    const width = type === 'calendar' ? 480 : (type === 'stopwatch' ? 240 : 300);
    const height = type === 'calendar' ? 600 : (type === 'stopwatch' ? 220 : 200);

    const { x, y } = findSafePosition(width, height);
    
    const newPin: PinData = {
      id: `${type}-${Date.now()}`,
      type,
      content: type === 'todo' ? JSON.stringify([]) : '',
      x,
      y,
      width,
      height,
      color: '#FFFFFF',
      zIndex: maxZ + 1,
      rotation: (Math.random() - 0.5) * 4,
    };

    setPins(prev => {
      const next = [...prev, newPin];
      masterStateRef.current.pins = next;
      return next;
    });
    setShowAddMenu(false);
    setSelectedPinId(newPin.id);
  };

  const updatePin = useCallback((id: string, updates: Partial<PinData>) => {
    setPins(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      masterStateRef.current.pins = next;
      return next;
    });
  }, []);

  const deletePin = useCallback((id: string) => {
    setPins(prev => {
      const next = prev.filter(p => p.id !== id);
      masterStateRef.current.pins = next;
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback((id: string, isFullscreen: boolean) => {
    setFullscreenPinId(isFullscreen ? id : null);
  }, []);

  const handleCopyBoardUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?board=${boardId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTheme = () => setManualTheme(prev => prev === 'dark' ? 'light' : 'dark');

  /* ── Rendering Logic ────────────────────────────────────────── */
  const baseBg = isDark ? THEME_CONFIG.backgrounds.dark : THEME_CONFIG.backgrounds.light;
  
  const currentBoardBg = isDark 
    ? (THEME_CONFIG.boardPalettes.dark.some(p => p.color === boardColor) ? boardColor : null)
    : (THEME_CONFIG.boardPalettes.light.some(p => p.color === boardColor) ? boardColor : null);

  const palette = isDark ? THEME_CONFIG.boardPalettes.dark : THEME_CONFIG.boardPalettes.light;

  return (
    <div
      ref={boardRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => {
        // Click background to deselect
        if (e.target === boardRef.current) {
          setSelectedPinId(null);
        }
      }}
      className={`w-full h-full relative transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: currentBoardBg || baseBg,
        backgroundImage: `radial-gradient(circle, ${getAdaptiveDotColor(currentBoardBg, isDark)} 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
        backgroundAttachment: 'fixed',
        transition: 'background-color 0.4s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* ── Minimalist Instructions ────────────────────────────────── */}
      <AnimatePresence>
        {!fullscreenPinId && hasLoaded && pins.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-slate-800/20 backdrop-blur-sm flex items-center justify-center border border-white/10 dark:border-slate-700/30 shadow-sm">
              <StickyNote className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
              Click <span className="text-slate-600 dark:text-slate-300 font-bold">+</span> to drop a pin anywhere
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pins Render ───────────────────────────────────────────── */}
      <AnimatePresence>
        {!fullscreenPinId && hasLoaded && pins.map(pin => {
          if (pin.type === 'calendar') {
             return (
              <CalendarPin key={pin.id} pin={pin} boardId={boardId}
                onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                isLocked={isLocked}
                isSelected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onOpenInspector={() => setInspectorPinId(prev => prev === pin.id ? null : pin.id)}
                onBringToFront={bringToFront}
                onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
            );
          } else if (pin.type === 'stopwatch') {
            return (
              <StopwatchPin key={pin.id} pin={pin}
                onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                isLocked={isLocked}
                isSelected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onOpenInspector={() => setInspectorPinId(prev => prev === pin.id ? null : pin.id)}
                onBringToFront={bringToFront}
                onToggleFullscreen={(fs) => toggleFullscreen(pin.id, fs)}
                isFullscreen={false}
                onToggleFocus={(tid) => setActiveFocusTaskId(tid)}
                activeTaskId={activeFocusTaskId}
                activeTaskName={activeTaskInfo?.text}
                activeTaskColor={activeTaskInfo?.color}
                onFocusIncrement={(tid = activeFocusTaskId, amount = 1) => {
                  if (!tid) return;
                  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
                  setFocusHistory(prev => {
                    const nextToday = { 
                      ...(prev[today] || {}), 
                      [tid]: (prev[today]?.[tid] || 0) + amount 
                    };
                    const next = { ...prev, [today]: nextToday };
                    masterStateRef.current.focusHistory = next;
                    return next;
                  });
                }}
                onDragStart={onDragStart} isDragging={dragging?.id === pin.id}
                allPins={pins} />
            );
          } else if (pin.type === 'focus-summary') {
            return (
              <FocusSummaryPin key={pin.id} pin={pin}
                onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                isLocked={isLocked}
                isSelected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onOpenInspector={() => setInspectorPinId(prev => prev === pin.id ? null : pin.id)}
                onBringToFront={bringToFront}
                dailyTotal={dailyTotal}
                onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
            );
          } else if (pin.type === 'weekly-analysis') {
            return (
              <WeeklyAnalysisPin key={pin.id} pin={pin}
                onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                isLocked={isLocked}
                isSelected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onOpenInspector={() => setInspectorPinId(prev => prev === pin.id ? null : pin.id)}
                onBringToFront={bringToFront}
                weeklyData={weeklyData}
                focusHistory={focusHistory}
                allPins={pins}
                onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
            );
          } else {
            return (
              <Pin key={pin.id} pin={pin} boardId={boardId}
                onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                isLocked={isLocked}
                isSelected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onOpenInspector={() => setInspectorPinId(prev => prev === pin.id ? null : pin.id)}
                onBringToFront={bringToFront}
                activeFocusTaskId={activeFocusTaskId}
                onStartFocus={(tid) => {
                  const sw = pins.find(p => p.type === 'stopwatch');
                  if (activeFocusTaskId === tid) {
                    if (sw) updatePin(sw.id, { isPaused: true, startTime: null });
                    setActiveFocusTaskId(null);
                    masterStateRef.current.activeFocusTaskId = null;
                  } else {
                    if (sw) {
                      updatePin(sw.id, { isPaused: false, startTime: Date.now() });
                    } else {
                      addPin('stopwatch');
                    }
                    setActiveFocusTaskId(tid);
                    masterStateRef.current.activeFocusTaskId = tid;
                  }
                }}
                onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
            );
          }
        })}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreenPinId && pins.find(p => p.id === fullscreenPinId) && (
          <div className="fixed inset-0 z-[50000] bg-black">
             {(() => {
                const pin = pins.find(p => p.id === fullscreenPinId)!;
                if (pin.type === 'stopwatch') {
                   return (
                     <StopwatchPin 
                        pin={pin}
                        onUpdate={updatePin} onDelete={deletePin} isDark={isDark}
                        isLocked={isLocked} isSelected={false} onSelect={() => {}}
                        onOpenInspector={() => {}} 
                        onToggleFullscreen={(fs) => toggleFullscreen(pin.id, fs)}
                        isFullscreen={true}
                        activeTaskId={activeFocusTaskId}
                        activeTaskName={activeTaskInfo?.text}
                        activeTaskColor={activeTaskInfo?.color}
                        onFocusIncrement={(tid = activeFocusTaskId, amount = 1) => {
                          if (!tid) return;
                          const today = new Date().toLocaleDateString('en-CA');
                          setFocusHistory(prev => {
                            const nextToday = { 
                              ...(prev[today] || {}), 
                              [tid]: (prev[today]?.[tid] || 0) + amount 
                            };
                            const next = { ...prev, [today]: nextToday };
                            masterStateRef.current.focusHistory = next;
                            return next;
                          });
                        }}
                        onDragStart={() => {}}
                        onBringToFront={bringToFront}
                        allPins={pins}
                      />
                   );
                }
                return null;
             })()}
          </div>
        )}
      </AnimatePresence>

      {/* ── Universal Pin Inspector PORTAL ───────────────────────── */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence mode="wait">
            {inspectorPinId && (
              <PinInspector
                key={inspectorPinId}
                pin={pins.find(p => p.id === inspectorPinId) || null}
                onUpdate={updatePin}
                onDelete={(id) => {
                  deletePin(id);
                  setInspectorPinId(null);
                }}
                onClose={() => setInspectorPinId(null)}
                isDark={isDark}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── Actions Menu PORTAL ────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {showAddMenu && (
              <div 
                className="fixed inset-0 bg-black/5 backdrop-blur-[1px]" 
                style={{ zIndex: 2147483645 }}
                onClick={() => setShowAddMenu(false)} 
              />
            )}
          </AnimatePresence>

          <div 
            className={`fixed bottom-16 right-6 flex flex-col items-end gap-3 transition-opacity duration-300 ${fullscreenPinId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ zIndex: 2147483646 }}
          >
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-56 mb-1 overflow-y-auto max-h-[min(520px,calc(100vh-140px))] custom-scrollbar"
                >
                  <AnimatePresence mode="wait">
                    {menuView === 'main' ? (
                      <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                         <MenuBtn icon={<StickyNote className="w-3.5 h-3.5 text-amber-500" />} bg="bg-amber-100 dark:bg-amber-900/40" label="Note" onClick={() => addPin('note')} />
                         <MenuBtn icon={<ImageIcon className="w-3.5 h-3.5 text-emerald-500" />} bg="bg-emerald-100 dark:bg-emerald-900/40" label="Image" onClick={() => addPin('image')} divider />
                         <MenuBtn icon={<Calendar className="w-3.5 h-3.5 text-indigo-500" />} bg="bg-indigo-100 dark:bg-indigo-900/40" label="Countdown" onClick={() => addPin('countdown')} divider />
                         <MenuBtn icon={<CalendarDays className="w-3.5 h-3.5 text-sky-500" />} bg="bg-sky-100 dark:bg-sky-900/40" label="Calendar" onClick={() => addPin('calendar')} divider />
                         <MenuBtn icon={<ListTodo className="w-3.5 h-3.5 text-teal-500" />} bg="bg-teal-100 dark:bg-teal-900/40" label="To-Do List" onClick={() => addPin('todo')} divider />
                         <MenuBtn icon={<ClipboardList className="w-3.5 h-3.5 text-rose-500" />} bg="bg-rose-100 dark:bg-rose-900/40" label="Daily Tasks" onClick={() => addPin('daily-tasks')} divider />
                         <MenuBtn icon={<Clock className="w-3.5 h-3.5 text-indigo-500" />} bg="bg-indigo-100 dark:bg-indigo-900/40" label="Live Clock" onClick={() => addPin('clock')} divider />
                         <MenuBtn icon={<Timer className="w-3.5 h-3.5 text-indigo-500" />} bg="bg-indigo-100 dark:bg-indigo-900/40" label="Focus Stopwatch" onClick={() => addPin('stopwatch')} divider />
                         <MenuBtn icon={<BarChart3 className="w-3.5 h-3.5 text-emerald-500" />} bg="bg-emerald-100 dark:bg-emerald-900/40" label="Focus Stats" onClick={() => addPin('weekly-analysis')} divider />
                         <MenuBtn icon={<Target className="w-3.5 h-3.5 text-purple-500" />} bg="bg-purple-100 dark:bg-purple-900/40" label="Daily Summary" onClick={() => addPin('focus-summary')} divider />
                         
                         <div className="border-t border-slate-100 dark:border-slate-800">
                            <MenuBtn 
                              icon={isLocked ? <Unlock className="w-3.5 h-3.5 text-orange-500" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />} 
                              bg="bg-slate-100 dark:bg-slate-800" 
                              label={isLocked ? 'Unlock Board' : 'Lock Board'} 
                              onClick={() => {
                                setIsLocked(prev => {
                                  const next = !prev;
                                  masterStateRef.current.isLocked = next;
                                  localStorage.setItem('board-locked', String(next));
                                  return next;
                                });
                              }} 
                            />
                            <MenuBtn 
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} 
                              bg="bg-rose-100 dark:bg-rose-900/40" 
                              label="Clear Board" 
                              onClick={() => {
                                setClearConfirmInput('');
                                setMenuView('clear-confirm');
                              }} 
                              divider
                            />
                            <MenuBtn icon={copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />} bg="bg-blue-100 dark:bg-blue-900/40" label={copied ? 'Copied URL!' : 'Share Board'} onClick={handleCopyBoardUrl} divider />
                            <MenuBtn icon={<Palette className="w-3.5 h-3.5 text-violet-500" />} bg="bg-violet-100 dark:bg-violet-900/40" label="Theme & Palette" onClick={() => setMenuView('theme')} divider />
                            <MenuBtn icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />} bg="bg-rose-100 dark:bg-rose-900/40" label="Secure Sign Out" onClick={() => signOut(auth)} divider textClass="text-rose-500 font-bold" />
                         </div>
                      </motion.div>
                    ) : menuView === 'theme' ? (
                      <motion.div key="theme" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <button onClick={() => setMenuView('main')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Settings</span>
                        </div>
    
                        <button onClick={() => {
                          setManualTheme(prev => {
                            const next = prev === 'dark' ? 'light' : 'dark';
                            masterStateRef.current.manualTheme = next;
                            return next;
                          });
                        }} className="w-full p-3 flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl mb-4 border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-95 group">
                          <div className="flex items-center gap-2">
                            {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{isDark ? 'Forced Dark' : 'Forced Light'}</span>
                          </div>
                          <div className={`w-8 h-4.5 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.75 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isDark ? 'left-4.25' : 'left-0.75'}`} />
                          </div>
                        </button>
    
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2.5 px-0.5">Board Color</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {palette.map(t => (
                              <button
                                key={t.name}
                                onClick={() => {
                                  setBoardColor(t.color);
                                  masterStateRef.current.boardColor = t.color;
                                }}
                                className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${boardColor === t.color ? 'border-indigo-500 shadow-sm' : 'border-transparent'}`}
                                style={{ backgroundColor: t.color || baseBg }}
                              >
                                {boardColor === t.color && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="clear" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-rose-500" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">Danger Zone</h3>
                        <p className="text-[10px] text-slate-500 mb-4 leading-tight">This will wipe the entire board permanently.</p>
                        
                        <div className="w-full space-y-3">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 text-left uppercase pl-1">Type "confirm" to unlock</p>
                            <input 
                              type="text"
                              autoFocus
                              value={clearConfirmInput}
                              onChange={(e) => setClearConfirmInput(e.target.value.toLowerCase())}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 transition-colors dark:text-white"
                              placeholder="confirm"
                            />
                          </div>
                          
                          <button 
                            disabled={clearConfirmInput !== 'confirm'}
                            onClick={() => {
                              setPins([]);
                              masterStateRef.current.pins = [];
                              setShowAddMenu(false);
                              setMenuView('main');
                            }}
                            className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              clearConfirmInput === 'confirm' 
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:scale-[1.02] active:scale-95' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Delete Everything
                          </button>
                          
                          <button 
                            onClick={() => setMenuView('main')}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
    
            <div className="flex items-center gap-4">
              {!showAddMenu && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm pointer-events-none border border-white/20 dark:border-slate-800"
                >
                  Add your pin to the motivation board
                </motion.span>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setShowAddMenu(!showAddMenu);
                  if (!showAddMenu) setMenuView('main');
                }}
                style={{ backgroundColor: THEME_CONFIG.accent.primary, boxShadow: `0 8px 32px ${THEME_CONFIG.accent.glow}` }}
                className="w-12 h-12 rounded-full text-white flex items-center justify-center relative shadow-lg"
              >
                <span style={{ backgroundColor: THEME_CONFIG.accent.primary }} className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none" />
                <motion.div animate={{ rotate: showAddMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  <Plus className="w-6 h-6" />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function MenuBtn({ icon, bg, label, onClick, divider = false, textClass = "text-slate-700 dark:text-slate-200" }: { icon: React.ReactNode; bg: string; label: string; onClick: () => void; divider?: boolean; textClass?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${divider ? 'border-t border-slate-100 dark:border-slate-800' : ''} group`}
    >
      <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${textClass}`}>{label}</span>
    </button>
  );
}