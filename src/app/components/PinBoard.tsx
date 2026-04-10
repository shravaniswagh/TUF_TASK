import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Pin, PinData } from './Pin';
import { CalendarPin } from './CalendarPin';
import { useTheme } from 'next-themes';
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
  Palette,
  ChevronLeft,
  Sparkles,
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
 * Adaptive Dot Contrast Engine
 */
function getAdaptiveDotColor(bgColor: string | null, resolvedTheme?: string) {
  if (!bgColor) {
    return resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.09)';
  }
  try {
    const hex = bgColor.replace('#', '');
    let h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.45 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.09)';
  } catch {
    return resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.09)';
  }
}

export function PinBoard({ boardId }: { boardId: string }) {
  const [pins, setPins] = useState<PinData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'theme'>('main');
  const [boardColor, setBoardColor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const prevBoardIdRef = useRef(boardId);

  // HYDRATION: Ensure theme is ready but keep the tree stable
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Persistence Logic ────────────────────────────────────────── */
  useEffect(() => {
    const fetchPins = async () => {
      if (prevBoardIdRef.current !== boardId) {
        setHasLoaded(false);
        prevBoardIdRef.current = boardId;
      }
      try {
        const docSnap = await getDoc(doc(db, 'boards', boardId));
        let initialPins: PinData[] = [];
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pins) initialPins = data.pins;
          if (data.boardBackgroundColor) setBoardColor(data.boardBackgroundColor);
        }
        
        // Auto-add calendar if it's a completely new board
        const hasCalendar = initialPins.some((p: PinData) => p.type === 'calendar');
        if (!hasCalendar && initialPins.length === 0) {
           // We don't auto-add anymore to allow for the "Empty State" UI
        }
        
        setPins(initialPins);
        setHasLoaded(true);
      } catch (err) {
        console.error('Board Load Error:', err);
        setHasLoaded(true);
      }
    };
    fetchPins();
  }, [boardId]);

  useEffect(() => {
    if (!hasLoaded) return;
    const saveTimer = setTimeout(() => {
      const cleaned = pins.map(p => {
        const c: any = {};
        Object.entries(p).forEach(([k, v]) => { if (v !== undefined) c[k] = v; });
        return c;
      });
      setDoc(doc(db, 'boards', boardId), {
        pins: cleaned,
        boardBackgroundColor: boardColor,
        lastUpdated: new Date().toISOString(),
      }, { merge: true }).catch(err => console.error('Firestore Sync Error:', err));
    }, 1200);
    return () => clearTimeout(saveTimer);
  }, [pins, hasLoaded, boardId, boardColor]);

  /* ── Drag & Interaction ───────────────────────────────────────── */
  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    setDragging({ id, offsetX: e.clientX - pin.x, offsetY: e.clientY - pin.y });
  }, [pins]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPins(prev => prev.map(p =>
      p.id === dragging.id
        ? { ...p, x: e.clientX - dragging.offsetX, y: e.clientY - dragging.offsetY }
        : p
    ));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const addPin = (type: PinData['type']) => {
    const maxZ = pins.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
    setPins(prev => [...prev, {
      id: `${type}-${Date.now()}`,
      type,
      content: type === 'todo' ? JSON.stringify([]) : '',
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      width: type === 'calendar' ? 480 : 300,
      height: type === 'calendar' ? 600 : 300,
      color: '#FFFFFF',
      zIndex: maxZ + 1,
      rotation: (Math.random() - 0.5) * 4,
    }]);
    setShowMenu(false);
  };

  const updatePin = useCallback((id: string, updates: Partial<PinData>) =>
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)), []);

  const deletePin = useCallback((id: string) =>
    setPins(prev => prev.filter(p => p.id !== id)), []);

  const handleCopyBoardUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?board=${boardId}&web=true`);
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Theme & Palette Logic ─────────────────────────────────────── */
  const isDark = mounted && resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  
  // Theme-aware board color calculation
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
      className={`w-full h-full relative transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: currentBoardBg || 'var(--background)',
        backgroundImage: `radial-gradient(circle, ${getAdaptiveDotColor(currentBoardBg, resolvedTheme)} 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
        backgroundAttachment: 'fixed',
        transition: 'background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Empty State Instruction ─────────────────────────────────── */}
      <AnimatePresence>
        {hasLoaded && pins.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center"
          >
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-10 border border-white/20 dark:border-slate-800/50 shadow-2xl max-w-sm">
              <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                <Sparkles className="text-white w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Your Board is Ready!</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
                Your creative workspace is waiting for pins. Click the blue <span className="font-bold text-indigo-500">+</span> button below to add your first note, image, or calendar.
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Get Started
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pins Render ───────────────────────────────────────────── */}
      {hasLoaded && pins.map(pin => (
        pin.type === 'calendar' ? (
          <CalendarPin key={pin.id} pin={pin} boardId={boardId}
            onUpdate={updatePin} onDelete={deletePin}
            onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
        ) : (
          <Pin key={pin.id} pin={pin} boardId={boardId}
            onUpdate={updatePin} onDelete={deletePin}
            onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
        )
      ))}

      {/* ── Unified Action Menu ────────────────────────────────────── */}
      {hasLoaded && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 w-64 mb-3 overflow-hidden ring-1 ring-black/5 dark:ring-white/5"
              >
                <AnimatePresence mode="wait">
                  {menuView === 'main' ? (
                    <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                      <div className="p-1">
                        <MenuItem icon={<StickyNote className="w-4 h-4 text-amber-500" />} iconBg="bg-amber-100 dark:bg-amber-900/30" label="Sticky Note" onClick={() => addPin('note')} />
                        <MenuItem icon={<ImageIcon className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" label="Image Reference" onClick={() => addPin('image')} />
                        <MenuItem icon={<Calendar className="w-4 h-4 text-indigo-500" />} iconBg="bg-indigo-100 dark:bg-indigo-900/30" label="Project Countdown" onClick={() => addPin('countdown')} />
                        <MenuItem icon={<CalendarDays className="w-4 h-4 text-sky-500" />} iconBg="bg-sky-100 dark:bg-sky-900/30" label="Wall Calendar" onClick={() => addPin('calendar')} />
                        <MenuItem icon={<ListTodo className="w-4 h-4 text-teal-500" />} iconBg="bg-teal-100 dark:bg-teal-900/30" label="Simple To-Do" onClick={() => addPin('todo')} />
                        <MenuItem icon={<ClipboardList className="w-4 h-4 text-rose-500" />} iconBg="bg-rose-100 dark:bg-rose-900/30" label="Daily Routine" onClick={() => addPin('daily-tasks')} />
                      </div>
                      
                      <div className="px-1 border-t border-slate-100 dark:border-slate-800/60 pb-1">
                        <MenuItem icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-100 dark:bg-blue-900/30" label={copied ? 'Copied URL!' : 'Share Board'} onClick={handleCopyBoardUrl} />
                        <MenuItem icon={<Palette className="w-4 h-4 text-violet-500" />} iconBg="bg-violet-100 dark:bg-violet-900/30" label="Customize Theme" onClick={() => setMenuView('theme')} />
                        <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer group" onClick={() => signOut(auth)}>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0 group-hover:-translate-x-1 transition-transform">
                            <LogOut className="w-4 h-4 text-rose-500" />
                          </div>
                          <span className="text-sm font-bold text-rose-600">Secure Sign Out</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="theme" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="p-4">
                      <div className="flex items-center gap-3 mb-5 mt-1">
                        <button onClick={() => setMenuView('main')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Settings</span>
                      </div>

                      <button onClick={toggleTheme} className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-2xl mb-6 ring-1 ring-slate-100 dark:ring-slate-700/50 shadow-sm border border-transparent">
                        <div className="flex items-center gap-3">
                          {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                        </div>
                        <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-300 ${isDark ? 'left-5.5' : 'left-1'}`} />
                        </div>
                      </button>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Board Color</p>
                        <div className="grid grid-cols-4 gap-2">
                          {palette.map(t => (
                            <button
                              key={t.name}
                              onClick={() => setBoardColor(t.color)}
                              className={`w-12 h-12 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${boardColor === t.color ? 'border-indigo-500 shadow-lg ring-4 ring-indigo-500/10' : 'border-transparent'}`}
                              style={{ backgroundColor: t.color || (isDark ? '#050505' : '#f8fafc') }}
                            >
                              {boardColor === t.color && <Check className="w-4 h-4 text-indigo-500 drop-shadow-sm" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowMenu(!showMenu);
              if (!showMenu) setMenuView('main');
            }}
            style={{ backgroundColor: THEME_CONFIG.accent.primary, boxShadow: `0 10px 40px ${THEME_CONFIG.accent.glow}` }}
            className="w-16 h-16 text-white rounded-full flex items-center justify-center transition-all relative"
          >
            <span style={{ backgroundColor: THEME_CONFIG.accent.primary }} className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none" />
            <motion.div animate={{ rotate: showMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-8 h-8" />
            </motion.div>
          </motion.button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, iconBg, label, onClick }: { icon: React.ReactNode; iconBg: string; label: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group rounded-xl">
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}