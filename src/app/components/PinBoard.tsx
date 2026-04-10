import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Pin, PinData } from './Pin';
import { CalendarPin } from './CalendarPin';
import { useTheme } from 'next-themes';
import { THEME_CONFIG } from '../theme-config';
import {
  Plus,
  Settings2,
  Copy,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  StickyNote,
  Calendar,
  Image as ImageIcon,
  CalendarDays,
  ListTodo,
  ClipboardList,
  Check,
  Palette,
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
 * Ensures visibility across all theme colors.
 */
function getAdaptiveDotColor(bgColor: string | null, resolvedTheme?: string) {
  if (!bgColor) {
    return resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  }
  
  try {
    const hex = bgColor.replace('#', '');
    let fullHex = hex;
    if (hex.length === 3) {
      fullHex = hex.split('').map(c => c + c).join('');
    }
    
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If background is dark, use light dots. If light, use dark dots.
    return luminance < 0.45 
      ? 'rgba(255, 255, 255, 0.2)' // Brighter dots for dark backgrounds
      : 'rgba(0, 0, 0, 0.1)';      // Subtle dots for light backgrounds
  } catch (e) {
    return resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  }
}

export function PinBoard({ boardId }: { boardId: string }) {
  const [pins, setPins] = useState<PinData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'theme'>('main');
  const [boardColor, setBoardColor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const prevBoardIdRef = useRef(boardId);

  /* ── Persistence & Data Fetching ────────────────────────────────── */
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
        
        // Ensure at least one calendar exists
        const hasCalendar = initialPins.some((p: PinData) => p.type === 'calendar');
        if (!hasCalendar) {
          const defaultCalendar: PinData = {
            id: 'calendar-default',
            type: 'calendar',
            content: '',
            x: 40, y: 40, width: 480, height: 600,
            color: '#FFFFFF', zIndex: 1000, rotation: 0,
          };
          initialPins = [defaultCalendar, ...initialPins];
        }
        setPins(initialPins);
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load board:', error);
        setHasLoaded(true);
      }
    };
    fetchPins();
  }, [boardId]);

  // Firestore sync logic with cleaning
  useEffect(() => {
    if (!hasLoaded) return;
    const saveTimer = setTimeout(() => {
      const cleanedPins = pins.map(p => {
        const cleaned: any = {};
        Object.entries(p).forEach(([k, v]) => { if (v !== undefined) cleaned[k] = v; });
        return cleaned;
      });
      setDoc(doc(db, 'boards', boardId), { 
        pins: cleanedPins,
        boardBackgroundColor: boardColor,
        lastUpdated: new Date().toISOString()
      }, { merge: true }).catch(err => console.error('Firestore save failed:', err));
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [pins, hasLoaded, boardId, boardColor]);

  /* ── Dragging Engine ────────────────────────────────────────────── */
  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    setDragging({
      id,
      offsetX: e.clientX - pin.x,
      offsetY: e.clientY - pin.y,
    });
  }, [pins]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !boardRef.current) return;
    const newX = e.clientX - dragging.offsetX;
    const newY = e.clientY - dragging.offsetY;
    
    setPins(prev => prev.map(p => 
      p.id === dragging.id ? { ...p, x: newX, y: newY } : p
    ));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  /* ── Board Actions ───────────────────────────────────────────────── */
  const addPin = (type: PinData['type']) => {
    const newPin: PinData = {
      id: `${type}-${Date.now()}`,
      type,
      content: type === 'todo' ? JSON.stringify([]) : '',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: type === 'calendar' ? 480 : 300,
      height: type === 'calendar' ? 600 : 300,
      color: '#FFFFFF',
      zIndex: Math.max(0, ...pins.map(p => p.zIndex ?? 1)) + 1,
      rotation: (Math.random() - 0.5) * 4,
    };
    setPins([...pins, newPin]);
    setShowMenu(false);
  };

  const updatePin = useCallback((id: string, updates: Partial<PinData>) => {
    setPins(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePin = useCallback((id: string) => {
    setPins(prev => prev.filter(p => p.id !== id));
  }, []);

  const toggleThemeMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleCopyBoardUrl = () => {
    const url = `${window.location.host}/?board=${boardId}&web=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasLoaded) return null;

  return (
    <div
      ref={boardRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full h-full relative"
      style={{
        backgroundColor: boardColor || 'var(--background)',
        backgroundImage: `radial-gradient(circle, ${getAdaptiveDotColor(boardColor, resolvedTheme)} 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Pins Render ───────────────────────────────────────────── */}
      {pins.map(pin => (
        pin.type === 'calendar' ? (
          <CalendarPin 
            key={pin.id} 
            pin={pin} 
            boardId={boardId} 
            onUpdate={updatePin} 
            onDelete={deletePin} 
            onDragStart={onDragStart}
            isDragging={dragging?.id === pin.id}
          />
        ) : (
          <Pin 
            key={pin.id} 
            pin={pin} 
            boardId={boardId}
            onUpdate={updatePin} 
            onDelete={deletePin} 
            onDragStart={onDragStart}
            isDragging={dragging?.id === pin.id}
          />
        )
      ))}

      {/* ── Floating Unified Menu ──────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden w-64 mb-2 backdrop-blur-xl"
            >
              <AnimatePresence mode="wait">
                {menuView === 'main' ? (
                  /* ── MAIN MENU VIEW ── */
                  <motion.div
                    key="main-view"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-2 grid grid-cols-2 gap-1 border-b border-slate-100 dark:border-slate-800">
                      <button onClick={() => addPin('note')} className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500"><StickyNote className="w-4 h-4" /></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Note</span>
                      </button>
                      <button onClick={() => addPin('image')} className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500"><ImageIcon className="w-4 h-4" /></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Image</span>
                      </button>
                      <button onClick={() => addPin('todo')} className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-500"><ListTodo className="w-4 h-4" /></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">To-Do</span>
                      </button>
                      <button onClick={() => addPin('calendar')} className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-500"><CalendarDays className="w-4 h-4" /></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Calendar</span>
                      </button>
                    </div>

                    <div className="p-1">
                      <button onClick={() => addPin('daily-tasks')} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group">
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform"><ClipboardList className="w-3.5 h-3.5" /></div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Daily Tasks Sync</span>
                      </button>
                      <button onClick={handleCopyBoardUrl} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-500">{copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copied ? 'Copied URL!' : 'Share Board'}</span>
                      </button>
                      <button onClick={() => setMenuView('theme')} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:rotate-12 transition-transform"><Palette className="w-3.5 h-3.5" /></div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Change Theme</span>
                      </button>
                    </div>

                    <button onClick={() => signOut(auth)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors border-t border-slate-100 dark:border-slate-800 group">
                      <div className="w-6 h-6 flex items-center justify-center group-hover:-translate-x-1 transition-transform"><LogOut className="w-4 h-4 text-rose-500" /></div>
                      <span className="text-sm font-bold text-rose-600">Sign Out</span>
                    </button>
                  </motion.div>
                ) : (
                  /* ── THEME MENU VIEW ── */
                  <motion.div
                    key="theme-view"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    className="p-4"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <button onClick={() => setMenuView('main')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Board Theme</span>
                    </div>

                    <button onClick={toggleThemeMode} className="w-full px-4 py-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl mb-6 shadow-inner border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        {resolvedTheme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${resolvedTheme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${resolvedTheme === 'dark' ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Background Palette</span>
                      <div className="grid grid-cols-4 gap-2.5">
                        {(resolvedTheme === 'dark' ? THEME_CONFIG.boardPalettes.dark : THEME_CONFIG.boardPalettes.light).map((t) => (
                          <button
                            key={t.name}
                            onClick={() => setBoardColor(t.color)}
                            className={`w-12 h-12 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${boardColor === t.color ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent'}`}
                            style={{ backgroundColor: t.color || (resolvedTheme === 'dark' ? '#050505' : '#f8fafc') }}
                            title={t.name}
                          >
                             {boardColor === t.color && <Check className="w-4 h-4 mx-auto text-indigo-500 drop-shadow-sm" />}
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
            if (!showMenu) setMenuView('main'); // Reset to main when opening
          }}
          style={{ 
            backgroundColor: THEME_CONFIG.accent.primary, 
            boxShadow: `0 10px 40px ${THEME_CONFIG.accent.glow}` 
          }}
          className="w-16 h-16 text-white rounded-full flex items-center justify-center transition-all relative z-[10000]"
        >
          <span style={{ backgroundColor: THEME_CONFIG.accent.primary }} className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none" />
          <motion.div animate={{ rotate: showMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-8 h-8" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}