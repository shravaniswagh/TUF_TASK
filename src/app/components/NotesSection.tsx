import { useState } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

interface NotesSectionProps {
  notes: Note[];
  selectedRange: DateRange;
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
  scrollbarColor?: string;
}

export function NotesSection({
  notes,
  selectedRange,
  onAddNote,
  onDeleteNote,
  scrollbarColor,
}: NotesSectionProps) {
  const [noteText, setNoteText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteText.trim()) {
      onAddNote(noteText);
      setNoteText('');
      setIsAdding(false);
    }
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.start) return 'No date selected';
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!range.end) {
      return formatDate(range.start);
    }

    if (range.start.getTime() === range.end.getTime()) {
      return formatDate(range.start);
    }

    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  return (
    <div className="h-full flex flex-col p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Notes</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          aria-label="Add note"
        >
          <Plus className={`w-5 h-5 text-slate-600 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Selected Date Range Info */}
      {selectedRange.start && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">Selected Range</div>
              <div className="text-blue-700">{formatDateRange(selectedRange)}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Note Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-6 overflow-hidden"
          >
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={selectedRange.start ? "Add a note for this date range..." : "Select a date first, then add a note..."}
              className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={!noteText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Note
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNoteText('');
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div 
        className="flex-1 overflow-y-auto space-y-3 custom-scrollbar"
        style={{
          // @ts-ignore
          '--scrollbar-color': scrollbarColor,
          // @ts-ignore
          '--scrollbar-color-hover': scrollbarColor ? `${scrollbarColor}cc` : undefined,
        }}
      >
        <AnimatePresence>
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">No notes yet</p>
              <p className="text-slate-400 text-xs mt-1">
                Select a date and click + to add a note
              </p>
            </motion.div>
          ) : (
            notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                layout
                className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDateRange(note.dateRange)}</span>
                  </div>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                    aria-label="Delete note"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Lines (like the reference image) */}
      <div className="mt-6 space-y-3 opacity-20">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-px bg-slate-300" />
        ))}
      </div>
    </div>
  );
}
