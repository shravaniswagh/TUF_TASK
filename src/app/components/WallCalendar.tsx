import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarGrid } from './CalendarGrid';
import { NotesSection } from './NotesSection';
import exampleImage from '../hero.png';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Note {
  id: string;
  text: string;
  dateRange: DateRange;
  monthYear: string;
}

interface WallCalendarProps {
  boardId: string;
  onFullscreenToggle?: () => void;
  onSidebarToggle?: (isCollapsed: boolean) => void;
  isFullscreen?: boolean;
  headerImage?: string;
  curveColor?: string;
  backgroundColor?: string;
  zoomLevel?: number;
  isDark: boolean;
}

function darkenColor(hex: string, percent: number): string {
  if (!hex || hex.startsWith('rgba') || hex === 'transparent') return 'rgba(0,0,0,0.1)';
  // Remove hash if present
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  // Parse RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Darken
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));

  // Ensure bounds
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  const rr = r.toString(16).padStart(2, '0');
  const gg = g.toString(16).padStart(2, '0');
  const bb = b.toString(16).padStart(2, '0');

  return `#${rr}${gg}${bb}`;
}

export function WallCalendar({ 
  boardId,
  onFullscreenToggle, 
  onSidebarToggle,
  isFullscreen = false,
  headerImage,
  curveColor = '#5B9BD5',
  backgroundColor = '#ffffff',
  zoomLevel = 1,
  isDark
}: WallCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange>({ start: null, end: null });
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  // Calculate scrollbar color
  const scrollbarColor = darkenColor(backgroundColor, 15);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('calendar-main-container');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      // Safety zone: calendar grid must be at least 350px
      const minCalendarWidth = 350;
      const maxSidebarWidth = containerRect.width - minCalendarWidth;
      
      if (newWidth > 200 && newWidth < maxSidebarWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Use provided headerImage or default
  const displayImage = headerImage || exampleImage;

  // Load notes from Firebase on mount
  useEffect(() => {
    const fetchNotes = async () => {
      setHasLoaded(false);
      try {
        const docSnap = await getDoc(doc(db, 'notes', boardId));
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notes) {
            // Convert date strings back to Date objects
            const notesWithDates = data.notes.map((note: any) => ({
              ...note,
              dateRange: {
                start: note.dateRange.start ? new Date(note.dateRange.start) : null,
                end: note.dateRange.end ? new Date(note.dateRange.end) : null,
              },
            }));
            setNotes(notesWithDates);
          }
        } else {
          setNotes([]); // Clear notes for a new board
        }
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load notes:', error);
        setHasLoaded(true);
      }
    };
    
    fetchNotes();
  }, [boardId]);

  // Save notes to Firebase whenever they change (debounced)
  useEffect(() => {
    if (!hasLoaded) return;
    
    const saveTimer = setTimeout(() => {
      // Convert Dates to ISO strings for Firestore storage
      const serializedNotes = notes.map(note => ({
        ...note,
        dateRange: {
          start: note.dateRange.start ? note.dateRange.start.toISOString() : null,
          end: note.dateRange.end ? note.dateRange.end.toISOString() : null,
        }
      }));
      
      setDoc(doc(db, 'notes', boardId), { notes: serializedNotes }, { merge: true })
        .catch(error => console.error('Failed to save notes:', error));
    }, 1000);
    
    return () => clearTimeout(saveTimer);
  }, [notes, hasLoaded, boardId]);

  const currentMonthYear = `${currentDate.toLocaleDateString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`;

  const handlePreviousMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedRange({ start: null, end: null });
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedRange({ start: null, end: null });
  };

  const handleDateClick = (date: Date) => {
    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start a new selection
      setSelectedRange({ start: date, end: null });
    } else {
      // Complete the selection
      if (date < selectedRange.start) {
        setSelectedRange({ start: date, end: selectedRange.start });
      } else {
        setSelectedRange({ start: selectedRange.start, end: date });
      }
    }
  };

  const handleAddNote = (text: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      text,
      dateRange: { ...selectedRange },
      monthYear: currentMonthYear,
    };
    setNotes([...notes, newNote]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const currentMonthNotes = notes.filter(note => note.monthYear === currentMonthYear);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className={`min-h-full ${isFullscreen ? 'bg-gradient-to-br from-slate-50 to-slate-100 p-8' : ''} flex items-center justify-center`}>
      <div className={`w-full h-full ${isFullscreen ? 'max-w-6xl' : ''}`}>
        {/* Calendar Container */}
          <motion.div
          id="calendar-main-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ backgroundColor, fontSize: `${zoomLevel * 100}%` }}
          className={`h-full overflow-hidden relative flex flex-col ${isFullscreen ? 'rounded-lg shadow-2xl' : ''}`}
        >
          {/* Spiral Binding Effect */}
          <div className="h-8 bg-gradient-to-b from-slate-200 to-slate-100 border-b border-slate-300 flex items-center justify-center gap-3 px-4 shrink-0">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-5 bg-slate-400 rounded-full shadow-inner"
                style={{
                  background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #475569 100%)',
                }}
              />
            ))}
          </div>

          {/* Main Calendar Content */}
          <div className="flex flex-1 overflow-auto custom-scrollbar min-h-0">
            {/* Image and Month Section */}
            <div className="relative flex flex-col flex-1 min-w-0">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentMonthYear}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="relative flex-1 flex flex-col"
                >
                  {/* Hero Image with Wave Overlay */}
                  <div className={`relative ${isFullscreen ? 'h-64 md:h-96' : 'h-48 md:h-64'} overflow-hidden shrink-0`}>
                    <img
                      src={displayImage}
                      alt="Calendar hero"
                      className="w-full h-full object-cover"
                    />

                    {/* Diagonal Wave Overlay */}
                    <svg
                      className="absolute inset-x-0 bottom-0 w-full h-32"
                      viewBox="0 0 1000 200"
                      preserveAspectRatio="none"
                    >
                      {/* Main Curve */}
                      <path
                        d="M 0 100 Q 250 50, 500 100 T 1000 100 L 1000 200 L 0 200 Z"
                        fill={curveColor}
                      />
                    </svg>

                    {/* Month and Year */}
                    <div className="absolute bottom-6 right-8 md:bottom-8 md:right-12 text-right z-10 drop-shadow-2xl">
                      <div 
                        className="text-white text-2xl md:text-3xl font-light tracking-[0.3em] mb-1 opacity-90 drop-shadow-lg"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {currentDate.getFullYear()}
                      </div>
                      <div 
                        className="text-white text-5xl md:text-7xl font-black tracking-tight uppercase drop-shadow-2xl"
                        style={{ 
                          fontFamily: "'Outfit', 'Inter', sans-serif",
                          lineHeight: 0.9
                        }}
                      >
                        {currentDate.toLocaleDateString('en-US', { month: 'long' })}
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className={`flex-1 overflow-auto custom-scrollbar ${isFullscreen ? 'p-6 md:p-8' : 'p-4 md:p-6'}`}>
                    <CalendarGrid
                      currentDate={currentDate}
                      selectedRange={selectedRange}
                      onDateClick={handleDateClick}
                      isDark={isDark}
                      hideLegend={!isFullscreen && zoomLevel < 0.8}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="absolute top-2 inset-x-2 flex justify-between z-20">
                <button
                  onClick={handlePreviousMonth}
                  className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <div className="flex gap-2">
                  {onFullscreenToggle && (
                    <button
                      onClick={onFullscreenToggle}
                      className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-5 h-5 text-slate-700" />
                      ) : (
                        <Maximize2 className="w-5 h-5 text-slate-700" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleNextMonth}
                    className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>
                  <button
                    onClick={() => {
                      const newState = !isSidebarCollapsed;
                      setIsSidebarCollapsed(newState);
                      onSidebarToggle?.(newState);
                    }}
                    className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110 ml-2"
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {isSidebarCollapsed ? (
                      <PanelRightOpen className="w-5 h-5 text-slate-700" />
                    ) : (
                      <PanelRightClose className="w-5 h-5 text-slate-700" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            {!isSidebarCollapsed && (
              <div
                onMouseDown={() => setIsResizing(true)}
                className={`w-1 cursor-col-resize hover:bg-blue-400/30 transition-colors shrink-0 ${isResizing ? 'bg-blue-400/50' : 'bg-slate-200/50'}`}
              />
            )}

            {/* Notes Section */}
            {!isSidebarCollapsed && (
              <div 
                className="border-l border-slate-200/50 shrink-0 overflow-hidden"
                style={{ 
                  backgroundColor: `${backgroundColor}dd`,
                  width: sidebarWidth,
                }}
              >
                <NotesSection
                  notes={currentMonthNotes}
                  selectedRange={selectedRange}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                  scrollbarColor={scrollbarColor}
                  isDark={isDark}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}