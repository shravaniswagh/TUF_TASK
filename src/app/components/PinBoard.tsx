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
 * Premium Adaptive Dot Contrast Engine
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [boardColor, setBoardColor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const prevBoardIdRef = useRef(boardId);

  // We use resolvedTheme for logic, but we design the components to be stable
  const isDark = resolvedTheme === 'dark';

  /* ── Load & Sync ─────────────────────────────────────────────── */
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
        setPins(initialPins);
        setHasLoaded(true);
      } catch (err) {
        console.error('Fetch Error:', err);
        setHasLoaded(true);
      }
    };
    fetchPins();
  }, [boardId]);

  useEffect(() => {
    if (!hasLoaded) return;
    const timeout = setTimeout(() => {
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
    }, 1200);
    return () => clearTimeout(timeout);
  }, [pins, hasLoaded, boardId, boardColor]);

  /* ── Interaction Handlers ───────────────────────────────────── */
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
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: type === 'calendar' ? 480 : 300,
      height: type === 'calendar' ? 600 : 300,
      color: '#FFFFFF',
      zIndex: maxZ + 1,
      rotation: (Math.random() - 0.5) * 4,
    }]);
    setShowAddMenu(false);
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

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  /* ── Premium Aesthetic Logic ─────────────────────────────────── */
  // Auto-switch palette colors for dark mode if they were chosen from the light list
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
        backgroundImage: `radial-gradient(circle, ${getAdaptiveDotColor(currentBoardBg, isDark)} 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
        backgroundAttachment: 'fixed',
        transition: 'background-color 0.4s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* ── Minimalist Instructions ────────────────────────────────── */}
      <AnimatePresence>
        {hasLoaded && pins.length === 0 && (
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

      {/* ── Floating Action Menu (Vertical - High Standard) ────────── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-48 mb-1 overflow-hidden"
            >
              <MenuBtn icon={<StickyNote className="w-3.5 h-3.5 text-amber-500" />} bg="bg-amber-100 dark:bg-amber-900/40" label="Note" onClick={() => addPin('note')} />
              <MenuBtn icon={<ImageIcon className="w-3.5 h-3.5 text-emerald-500" />} bg="bg-emerald-100 dark:bg-emerald-900/40" label="Image" onClick={() => addPin('image')} divider />
              <MenuBtn icon={<Calendar className="w-3.5 h-3.5 text-indigo-500" />} bg="bg-indigo-100 dark:bg-indigo-900/40" label="Countdown" onClick={() => addPin('countdown')} divider />
              <MenuBtn icon={<CalendarDays className="w-3.5 h-3.5 text-sky-500" />} bg="bg-sky-100 dark:bg-sky-900/40" label="Calendar" onClick={() => addPin('calendar')} divider />
              <MenuBtn icon={<ListTodo className="w-3.5 h-3.5 text-emerald-500" />} bg="bg-emerald-100 dark:bg-emerald-900/40" label="To-Do List" onClick={() => addPin('todo')} divider />
              <MenuBtn icon={<ClipboardList className="w-3.5 h-3.5 text-rose-500" />} bg="bg-rose-100 dark:bg-rose-900/40" label="Daily Tasks" onClick={() => addPin('daily-tasks')} divider />
              
              <div className="border-t border-slate-100 dark:border-slate-800">
                <MenuBtn 
                  icon={copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />} 
                  bg="bg-blue-100 dark:bg-blue-900/40" 
                  label={copied ? 'Copied!' : 'Copy URL'} 
                  onClick={handleCopyBoardUrl} 
                />
                <MenuBtn 
                  icon={isDark ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />} 
                  bg="bg-slate-100 dark:bg-slate-800" 
                  label="Change Theme" 
                  onClick={toggleTheme} 
                  divider 
                />
                <button
                  onClick={() => signOut(auth)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors text-left border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <span className="text-sm font-bold text-rose-500">Sign Out</span>
                </button>
              </div>
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
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{ 
              backgroundColor: THEME_CONFIG.accent.primary,
              boxShadow: `0 8px 32px ${THEME_CONFIG.accent.glow}` 
            }}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center relative shadow-lg"
          >
            <span style={{ backgroundColor: THEME_CONFIG.accent.primary }} className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none" />
            <motion.div animate={{ rotate: showAddMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-7 h-7" />
            </motion.div>
          </motion.button>
        </div>
      </div>
      
      {/* Backdrop to close menu */}
      {showAddMenu && (
        <div className="absolute inset-0 z-[199]" onClick={() => setShowAddMenu(false)} />
      )}
    </div>
  );
}

/**
 * Clean Menu Button Component
 */
function MenuBtn({ icon, bg, label, onClick, divider = false }: { icon: React.ReactNode; bg: string; label: string; onClick: () => void; divider?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${divider ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
    >
      <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}