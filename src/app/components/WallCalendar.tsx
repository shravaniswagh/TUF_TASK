import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarGrid } from './CalendarGrid';
import { NotesSection } from './NotesSection';
import exampleImage from '../preview.png';

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
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

export function WallCalendar({ onFullscreenToggle, isFullscreen = false }: WallCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange>({ start: null, end: null });
  const [notes, setNotes] = useState<Note[]>([]);
  const [direction, setDirection] = useState(0);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('calendar-notes');
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        // Convert date strings back to Date objects
        const notesWithDates = parsed.map((note: any) => ({
          ...note,
          dateRange: {
            start: note.dateRange.start ? new Date(note.dateRange.start) : null,
            end: note.dateRange.end ? new Date(note.dateRange.end) : null,
          },
        }));
        setNotes(notesWithDates);
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendar-notes', JSON.stringify(notes));
  }, [notes]);

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white h-full overflow-hidden relative ${isFullscreen ? 'rounded-lg shadow-2xl' : ''}`}
        >
          {/* Spiral Binding Effect */}
          <div className="h-8 bg-gradient-to-b from-slate-200 to-slate-100 border-b border-slate-300 flex items-center justify-center gap-3 px-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Image and Month Section - Takes 2 columns on desktop */}
            <div className="lg:col-span-2 relative">
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
                  className="relative"
                >
                  {/* Hero Image with Wave Overlay */}
                  <div className={`relative ${isFullscreen ? 'h-64 md:h-96' : 'h-48 md:h-64'} overflow-hidden`}>
                    <img
                      src={exampleImage}
                      alt="Calendar hero"
                      className="w-full h-full object-cover"
                    />

                    {/* Diagonal Wave Overlay - Matching Reference Image */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 1000 600"
                      preserveAspectRatio="none"
                    >
                      {/* Blue diagonal section with curved edge */}
                      <path
                        d="M 0 400 Q 200 350, 400 380 T 800 420 L 1000 450 L 1000 600 L 0 600 Z"
                        fill="#5B9BD5"
                      />
                      {/* White curved section */}
                      <path
                        d="M 0 450 Q 200 400, 400 430 T 800 470 L 1000 500 L 1000 600 L 0 600 Z"
                        fill="#FFFFFF"
                      />
                    </svg>

                    {/* Month and Year - Positioned on blue section */}
                    <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 text-right z-10">
                      <div className="text-white text-2xl md:text-4xl font-light tracking-wider mb-1" style={{ WebkitTextStroke: '1px #333', textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
                        {currentDate.getFullYear()}
                      </div>
                      <div className="text-white text-3xl md:text-5xl font-bold tracking-wide" style={{ WebkitTextStroke: '2px #333', textShadow: '0px 2px 6px rgba(0,0,0,0.8)' }}>
                        {currentDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className={isFullscreen ? 'p-6 md:p-8' : 'p-4 md:p-6'}>
                    <CalendarGrid
                      currentDate={currentDate}
                      selectedRange={selectedRange}
                      onDateClick={handleDateClick}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <button
                onClick={handlePreviousMonth}
                className="absolute top-2 left-2 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <button
                onClick={handleNextMonth}
                className="absolute top-2 right-2 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
              {onFullscreenToggle && (
                <button
                  onClick={onFullscreenToggle}
                  className="absolute top-2 right-14 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5 text-slate-700" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-slate-700" />
                  )}
                </button>
              )}
            </div>

            {/* Notes Section - Takes 1 column */}
            <div className="lg:col-span-1 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200">
              <NotesSection
                notes={currentMonthNotes}
                selectedRange={selectedRange}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}