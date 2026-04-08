import { useState, useEffect, useCallback, useRef } from 'react';
import { Pin, PinData } from './Pin';
import { CalendarPin } from './CalendarPin';
import { Plus, StickyNote, Calendar, Image as ImageIcon, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TYPE_COLORS: Record<string, string[]> = {
  note:      ['#FFFBEB', '#EFF6FF', '#FDF4FF', '#F0FDF4', '#FFF1F2', '#FEF3C7', '#DBEAFE', '#FAE8FF', '#DCFCE7', '#FFE4E6'],
  image:     ['#F0FDF4', '#ECFDF5', '#F0F9FF'],
  countdown: ['#FDF4FF', '#EFF6FF', '#FFF7ED'],
  calendar:  ['#FFFFFF'],
};

function getColor(type: 'note' | 'image' | 'countdown' | 'calendar'): string {
  const colors = TYPE_COLORS[type];
  return colors[Math.floor(Math.random() * colors.length)];
}

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  startPinX: number;
  startPinY: number;
}

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
}

/**
 * Scatter a new pin at a random position inside the canvas.
 * Pure freeform — no grid, no rows, no columns.
 * Avoids overlapping with calendar pins.
 */
function scatterPosition(
  width: number,
  height: number,
  canvasW: number,
  canvasH: number,
  calendarPins: PinData[]
): { x: number; y: number } {
  const MARGIN = 24;
  const maxX = Math.max(MARGIN, canvasW - width - MARGIN);
  const maxY = Math.max(MARGIN, canvasH - height - MARGIN);
  
  // Try up to 50 times to find a non-overlapping position
  for (let attempt = 0; attempt < 50; attempt++) {
    const pos = {
      x: MARGIN + Math.random() * (maxX - MARGIN),
      y: MARGIN + Math.random() * (maxY - MARGIN),
    };
    
    const newRect = { ...pos, width, height };
    const overlapsCalendar = calendarPins.some(cal => 
      rectanglesOverlap(newRect, { x: cal.x, y: cal.y, width: cal.width, height: cal.height })
    );
    
    if (!overlapsCalendar) {
      return pos;
    }
  }
  
  // If we couldn't find a non-overlapping position after 50 attempts,
  // place it on the right side of the canvas
  return {
    x: Math.max(MARGIN, canvasW - width - MARGIN),
    y: MARGIN + Math.random() * (maxY - MARGIN),
  };
}

export function PinBoard() {
  const [pins, setPins] = useState<PinData[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  /* ── Persistence & Initial Calendar ──────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem('pin-board-v3');
    if (saved) {
      try { 
        const parsedPins = JSON.parse(saved);
        setPins(parsedPins);
        
        // Ensure there's always a calendar pin
        const hasCalendar = parsedPins.some((p: PinData) => p.type === 'calendar');
        if (!hasCalendar) {
          // Add default calendar pin
          const defaultCalendar: PinData = {
            id: 'calendar-default',
            type: 'calendar',
            content: '',
            x: 40,
            y: 40,
            width: 480,
            height: 600,
            color: '#FFFFFF',
            zIndex: 1000,
            rotation: 0,
          };
          setPins([defaultCalendar, ...parsedPins]);
        }
      } catch { 
        // If parsing fails, create default calendar
        const defaultCalendar: PinData = {
          id: 'calendar-default',
          type: 'calendar',
          content: '',
          x: 40,
          y: 40,
          width: 480,
          height: 600,
          color: '#FFFFFF',
          zIndex: 1000,
          rotation: 0,
        };
        setPins([defaultCalendar]);
      }
    } else {
      // No saved data - create default calendar
      const defaultCalendar: PinData = {
        id: 'calendar-default',
        type: 'calendar',
        content: '',
        x: 40,
        y: 40,
        width: 480,
        height: 600,
        color: '#FFFFFF',
        zIndex: 1000,
        rotation: 0,
      };
      setPins([defaultCalendar]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pin-board-v3', JSON.stringify(pins));
  }, [pins]);

  /* ── Drag handling ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      const dx = e.clientX - dragging.startMouseX;
      const dy = e.clientY - dragging.startMouseY;

      setPins(prev => {
        const calendarPins = prev.filter(p => p.type === 'calendar');
        
        return prev.map(p => {
          if (p.id !== dragging.id) return p;
          
          // Calculate new position
          let newX = Math.max(0, Math.min(dragging.startPinX + dx, boardRect.width - p.width));
          let newY = Math.max(0, Math.min(dragging.startPinY + dy, boardRect.height - p.height));
          
          // If this is not a calendar pin, check for overlap with calendar
          if (p.type !== 'calendar') {
            const newRect = { x: newX, y: newY, width: p.width, height: p.height };
            const overlapsCalendar = calendarPins.some(cal => 
              rectanglesOverlap(newRect, { x: cal.x, y: cal.y, width: cal.width, height: cal.height })
            );
            
            // If it overlaps, keep the previous position
            if (overlapsCalendar) {
              newX = p.x;
              newY = p.y;
            }
          }
          
          return { ...p, x: newX, y: newY };
        });
      });
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',  handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup',  handleMouseUp);
    };
  }, [dragging]);

  const handlePinDragStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      const pin = pins.find(p => p.id === id);
      if (!pin) return;
      setDragging({
        id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPinX: pin.x,
        startPinY: pin.y,
      });
    },
    [pins]
  );

  /* ── Add pin ─────────────────────────────────────────────────────── */
  const addPin = (type: 'image' | 'note' | 'countdown' | 'calendar') => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    // Calendar gets larger default size
    const width  = type === 'calendar' ? 480 : type === 'countdown' ? 200 : 240;
    const height = type === 'calendar' ? 600 : type === 'countdown' ? 170 : 210;

    const calendarPins = pins.filter(p => p.type === 'calendar');
    const pos = scatterPosition(width, height, boardRect.width, boardRect.height, calendarPins);

    const today     = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];

    const newPin: PinData = {
      id:      Date.now().toString(),
      type,
      content: type === 'countdown' ? endOfYear : '',
      label:   type === 'countdown' ? 'End of Year' : undefined,
      x:       pos.x,
      y:       pos.y,
      width,
      height,
      color:   getColor(type),
    };

    setPins(prev => [...prev, newPin]);
    setShowAddMenu(false);
  };

  const updatePin = useCallback(
    (id: string, updates: Partial<PinData>) =>
      setPins(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p))),
    []
  );

  const deletePin = useCallback(
    (id: string) => setPins(prev => prev.filter(p => p.id !== id)),
    []
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={boardRef}
      style={{
        position:        'relative',
        width:           '100%',
        height:          '100%',
        userSelect:      dragging ? 'none' : 'auto',
        cursor:          dragging ? 'grabbing' : 'default',
        // Subtle dot-grid canvas texture — no layout, pure background
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize:  '28px 28px',
        // No overflow:hidden — pins are free; clipping removed
        overflow:        'hidden',
      }}
    >
      {/* Pins — every pin is position:absolute via its own inline style */}
      {pins.map(pin => (
        pin.type === 'calendar' ? (
          <CalendarPin
            key={pin.id}
            pin={pin}
            onUpdate={updatePin}
            onDelete={deletePin}
            onDragStart={handlePinDragStart}
            isDragging={dragging?.id === pin.id}
          />
        ) : (
          <Pin
            key={pin.id}
            pin={pin}
            onUpdate={updatePin}
            onDelete={deletePin}
            onDragStart={handlePinDragStart}
            isDragging={dragging?.id === pin.id}
          />
        )
      ))}

      {/* Empty state */}
      <AnimatePresence>
        {pins.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <StickyNote className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Click <span className="text-slate-600 font-medium">+</span> to drop a pin anywhere
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Add Button (FAB) ──────────────────────────────── */}
      <div
        className="absolute bottom-6 right-6 flex flex-col items-end gap-2"
        style={{ zIndex: 200 }}
      >
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden w-44 mb-1"
            >
              <button
                onClick={() => addPin('note')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-sm text-slate-700">Note</span>
              </button>
              <button
                onClick={() => addPin('image')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-sm text-slate-700">Image</span>
              </button>
              <button
                onClick={() => addPin('countdown')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-sm text-slate-700">Countdown</span>
              </button>
              <button
                onClick={() => addPin('calendar')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-sm text-slate-700">Calendar</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {!showAddMenu && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-medium text-slate-500 bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm pointer-events-none"
            >
              Add your pin to the motivation board
            </motion.span>
          )}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAddMenu(v => !v)}
            className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center justify-center hover:bg-blue-600 transition-colors relative"
          >
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20"></span>
            <motion.div
              animate={{ rotate: showAddMenu ? 45 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Backdrop to close menu */}
      {showAddMenu && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 199 }}
          onClick={() => setShowAddMenu(false)}
        />
      )}
    </div>
  );
}