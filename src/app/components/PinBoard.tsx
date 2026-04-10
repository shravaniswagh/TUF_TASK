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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

function getAdaptiveDotColor(bgColor: string | null, resolvedTheme?: string) {
  if (!bgColor) {
    return resolvedTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.09)';
  }
  try {
    const hex = bgColor.replace('#', '');
    let h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.45
      ? 'rgba(255,255,255,0.22)'  // brighter for dark backgrounds
      : 'rgba(0,0,0,0.09)';       // subtle for light backgrounds
  } catch {
    return resolvedTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.09)';
  }
}

export function PinBoard({ boardId }: { boardId: string }) {
  const [pins, setPins] = useState<PinData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu]   = useState(false);
  const [menuView, setMenuView]   = useState<'main' | 'theme'>('main');
  const [boardColor, setBoardColor] = useState<string | null>(null);
  const [dragging, setDragging]   = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const prevBoardIdRef = useRef(boardId);

  // Correctly handle mount for next-themes
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Load & Save ───────────────────────────────────────────────── */
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
        const hasCalendar = initialPins.some((p: PinData) => p.type === 'calendar');
        if (!hasCalendar) {
          initialPins = [{
            id: 'calendar-default', type: 'calendar', content: '',
            x: 40, y: 40, width: 480, height: 600,
            color: '#FFFFFF', zIndex: 1000, rotation: 0,
          }, ...initialPins];
        }
        setPins(initialPins);
        setHasLoaded(true);
      } catch (err) {
        console.error('Failed to load board:', err);
        setHasLoaded(true);
      }
    };
    fetchPins();
  }, [boardId]);

  useEffect(() => {
    if (!hasLoaded) return;
    const t = setTimeout(() => {
      const cleaned = pins.map(p => {
        const c: any = {};
        Object.entries(p).forEach(([k, v]) => { if (v !== undefined) c[k] = v; });
        return c;
      });
      setDoc(doc(db, 'boards', boardId), {
        pins: cleaned,
        boardBackgroundColor: boardColor,
        lastUpdated: new Date().toISOString(),
      }, { merge: true }).catch(console.error);
    }, 1000);
    return () => clearTimeout(t);
  }, [pins, hasLoaded, boardId, boardColor]);

  /* ── Drag Engine ───────────────────────────────────────────────── */
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

  /* ── Pin Actions ───────────────────────────────────────────────── */
  const addPin = (type: PinData['type']) => {
    const maxZ = pins.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
    setPins(prev => [...prev, {
      id: `${type}-${Date.now()}`,
      type,
      content: type === 'todo' ? JSON.stringify([]) : '',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width:  type === 'calendar' ? 480 : 300,
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

  /* ── Theme Toggle ──────────────────────────────────────────────── */
  const isDark = mounted && resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  if (!hasLoaded || !mounted) return null;

  /* ── Palette for current mode ──────────────────────────────────── */
  const palette = isDark ? THEME_CONFIG.boardPalettes.dark : THEME_CONFIG.boardPalettes.light;

  // Determine if we should show the custom background or fall back to theme default
  // If it's Dark Mode, we only allow colors from the dark palette
  const currentBoardBg = isDark 
    ? (THEME_CONFIG.boardPalettes.dark.some(p => p.color === boardColor) ? boardColor : null)
    : (THEME_CONFIG.boardPalettes.light.some(p => p.color === boardColor) ? boardColor : null);

  return (
    <div
      ref={boardRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full h-full relative"
      style={{
        backgroundColor: currentBoardBg || 'var(--background)',
        backgroundImage: `radial-gradient(circle, ${getAdaptiveDotColor(currentBoardBg, resolvedTheme)} 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
        backgroundAttachment: 'fixed',
        transition: 'background-color 0.4s ease',
        overflow: 'hidden',
      }}
    >
      {pins.map(pin =>
        pin.type === 'calendar' ? (
          <CalendarPin key={pin.id} pin={pin} boardId={boardId}
            onUpdate={updatePin} onDelete={deletePin}
            onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
        ) : (
          <Pin key={pin.id} pin={pin} boardId={boardId}
            onUpdate={updatePin} onDelete={deletePin}
            onDragStart={onDragStart} isDragging={dragging?.id === pin.id} />
        )
      )}

      {/* ── FAB + Menu ───────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-56 mb-2 overflow-hidden"
            >
              <AnimatePresence mode="wait">

                {/* ── MAIN LIST ── */}
                {menuView === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <MenuItem icon={<StickyNote className="w-3.5 h-3.5 text-amber-500" />}  iconBg="bg-amber-100 dark:bg-amber-900/40"    label="Note"         onClick={() => addPin('note')} />
                    <MenuItem icon={<ImageIcon className="w-3.5 h-3.5 text-emerald-500" />} iconBg="bg-emerald-100 dark:bg-emerald-900/40" label="Image"        onClick={() => addPin('image')} divider />
                    <MenuItem icon={<Calendar className="w-3.5 h-3.5 text-indigo-500" />}   iconBg="bg-indigo-100 dark:bg-indigo-900/40"  label="Countdown"    onClick={() => addPin('countdown')} divider />
                    <MenuItem icon={<CalendarDays className="w-3.5 h-3.5 text-sky-500" />}  iconBg="bg-sky-100 dark:bg-sky-900/40"        label="Calendar"     onClick={() => addPin('calendar')} divider />
                    <MenuItem icon={<ListTodo className="w-3.5 h-3.5 text-emerald-500" />}  iconBg="bg-emerald-100 dark:bg-emerald-900/40" label="To-Do List"  onClick={() => addPin('todo')} divider />
                    <MenuItem icon={<ClipboardList className="w-3.5 h-3.5 text-rose-500" />} iconBg="bg-rose-100 dark:bg-rose-900/40"    label="Daily Tasks"  onClick={() => addPin('daily-tasks')} divider />
                    <MenuItem
                      icon={copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                      iconBg="bg-blue-100 dark:bg-blue-900/40"
                      label={copied ? 'Copied!' : 'Copy Site URL'}
                      onClick={handleCopyBoardUrl}
                      divider
                    />
                    <MenuItem
                      icon={<Palette className="w-3.5 h-3.5 text-violet-500" />}
                      iconBg="bg-violet-100 dark:bg-violet-900/40"
                      label="Change Theme"
                      onClick={() => setMenuView('theme')}
                      divider
                    />
                    {/* Sign Out — single, styled differently */}
                    <button
                      onClick={() => signOut(auth)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <span className="text-xs font-medium text-rose-500">Sign Out</span>
                    </button>
                  </motion.div>
                )}

                {/* ── THEME PANEL ── */}
                {menuView === 'theme' && (
                  <motion.div
                    key="theme"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className="p-4"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => setMenuView('main')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Board Theme</span>
                    </div>

                    {/* Light / Dark toggle */}
                    <button
                      onClick={toggleTheme}
                      className="w-full px-3 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark
                          ? <Moon className="w-4 h-4 text-indigo-400" />
                          : <Sun  className="w-4 h-4 text-amber-500" />}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {isDark ? 'Dark Mode' : 'Light Mode'}
                        </span>
                      </div>
                      {/* Toggle pill */}
                      <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 ${isDark ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    {/* Colour palette */}
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-0.5">Background</p>
                    <div className="grid grid-cols-4 gap-2">
                      {palette.map(t => (
                        <button
                          key={t.name}
                          onClick={() => setBoardColor(t.color)}
                          title={t.name}
                          className={`w-11 h-11 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center
                            ${boardColor === t.color
                              ? 'border-indigo-500 ring-2 ring-indigo-400/30'
                              : 'border-transparent hover:border-slate-300'}`}
                          style={{ backgroundColor: t.color || (isDark ? '#050505' : '#f8fafc') }}
                        >
                          {boardColor === t.color && (
                            <Check className="w-4 h-4 text-indigo-500 drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setShowMenu(prev => {
              if (!prev) setMenuView('main'); // always reset to main on open
              return !prev;
            });
          }}
          style={{
            backgroundColor: THEME_CONFIG.accent.primary,
            boxShadow: `0 8px 32px ${THEME_CONFIG.accent.glow}`,
          }}
          className="w-16 h-16 rounded-full text-white flex items-center justify-center relative"
        >
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none"
            style={{ backgroundColor: THEME_CONFIG.accent.primary }}
          />
          <motion.div animate={{ rotate: showMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-8 h-8" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}

/* ── Reusable menu item ──────────────────────────────────────────── */
function MenuItem({
  icon, iconBg, label, onClick, divider = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick: () => void;
  divider?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left
        ${divider ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
    >
      <div className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}