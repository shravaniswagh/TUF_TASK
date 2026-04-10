import { useTheme } from 'next-themes';
import { THEME_CONFIG } from '../theme-config';
import { Resizable } from 're-resizable';
import { X, GripVertical, Image as ImageIcon, Palette, Upload, Type, Plus, Trash2, CheckCircle2, Circle, ListTodo, ClipboardList, Settings2, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

export interface PinData {
  id: string;
  type: 'image' | 'note' | 'countdown' | 'calendar' | 'todo' | 'daily-tasks';
  content: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  imageObjectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  imageObjectPosition?: string;
  zIndex?: number;
  rotation?: number; // subtle tilt in degrees
  fontFamily?: string;
  fontSize?: string;
  headerImage?: string;
  curveColor?: string;
}

interface PinProps {
  pin: PinData;
  boardId: string;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const PIN_HEAD_COLORS: Record<string, string> = THEME_CONFIG.pinHeads;
const NOTE_COLORS = THEME_CONFIG.pinPalette;

function getContrastColor(hexColor?: string) {
  if (!hexColor || hexColor === 'transparent') return 'text-slate-700';
  
  try {
    // Remove hash
    const hex = hexColor.replace('#', '');
    
    // We only handle standard hex here. If it's short, expand it.
    let fullHex = hex;
    if (hex.length === 3) {
      fullHex = hex.split('').map(c => c + c).join('');
    }
    
    if (fullHex.length !== 6) return 'text-slate-900'; 
    
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'text-slate-900';
    
    // Brightness formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? 'text-slate-900' : 'text-slate-50';
  } catch (e) {
    return 'text-slate-900';
  }
}

function calculateDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function darkenColor(hex: string, percent: number): string {
  // Remove hash if present
  hex = hex.replace('#', '');
  
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

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export function Pin({ pin, boardId, onUpdate, onDelete, onDragStart, isDragging = false }: PinProps) {
  const { resolvedTheme } = useTheme();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [noteContent, setNoteContent] = useState(pin.content);
  const [labelContent, setLabelContent] = useState(pin.label || '');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImageControls, setShowImageControls] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [dailyNotes, setDailyNotes] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNoteContent(pin.content);
  }, [pin.content]);

  useEffect(() => {
    setLabelContent(pin.label || '');
  }, [pin.label]);

  useEffect(() => {
    if (isEditingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditingNote]);

  useEffect(() => {
    if (isEditingLabel && labelRef.current) {
      labelRef.current.focus();
    }
  }, [isEditingLabel]);

  // Daily Tasks sync logic
  useEffect(() => {
    if (pin.type === 'daily-tasks') {
      // Use Firestore listener instead of localStorage
      const unsubscribe = onSnapshot(doc(db, 'notes', boardId), (docSnap) => {
        if (docSnap.exists()) {
          try {
            const data = docSnap.data();
            const allNotes = data.notes || [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const filtered = allNotes.filter((note: any) => {
              const start = note.dateRange.start ? new Date(note.dateRange.start) : null;
              const end = note.dateRange.end ? new Date(note.dateRange.end) : null;
              
              if (!start) return false;
              
              const startDate = new Date(start);
              startDate.setHours(0, 0, 0, 0);
              
              if (!end) {
                return startDate.getTime() === today.getTime();
              }
              
              const endDate = new Date(end);
              endDate.setHours(23, 59, 59, 999);
              
              return today >= startDate && today <= endDate;
            });
            setDailyNotes(filtered);
          } catch (e) {
            console.error('Failed to parse calendar notes', e);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [pin.type, boardId]);

  const handleNoteSave = () => {
    onUpdate(pin.id, { content: noteContent });
    setIsEditingNote(false);
  };

  const handleLabelSave = () => {
    onUpdate(pin.id, { label: labelContent });
    setIsEditingLabel(false);
  };

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      onUpdate(pin.id, { content: imageUrl.trim() });
      setImageUrl('');
    }
    setShowImageInput(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(pin.id, { content: reader.result as string });
        setShowImageInput(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (color: string) => {
    onUpdate(pin.id, { color });
    setShowColorPicker(false);
  };

  const handleBringToFront = () => {
    onUpdate(pin.id, { zIndex: Date.now() });
  };

  // Todo logic
  const todos: TodoItem[] = pin.type === 'todo' ? (pin.content ? JSON.parse(pin.content) : []) : [];
  
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: Date.now().toString(), text: newTodo.trim(), completed: false }];
    onUpdate(pin.id, { content: JSON.stringify(updated) });
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    onUpdate(pin.id, { content: JSON.stringify(updated) });
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    onUpdate(pin.id, { content: JSON.stringify(updated) });
  };

  // Assign a stable random rotation on first render if not set
  useEffect(() => {
    if (pin.rotation === undefined) {
      const tilt = (Math.random() - 0.5) * 6; // –3° to +3°
      onUpdate(pin.id, { rotation: tilt });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColorPicker(false);
      setShowImageControls(false);
      setShowFontPicker(false);
    };

    if (showColorPicker || showImageControls || showFontPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showImageControls, showFontPicker]);

  const daysRemaining =
    pin.type === 'countdown' && pin.content
      ? calculateDaysRemaining(pin.content)
      : 0;

  const pinHeadColor = PIN_HEAD_COLORS[pin.type] || '#6366F1';
  
  // Calculate scrollbar color based on background
  const bgColor = pin.color || (pin.type === 'todo' ? '#F0FDF4' : pin.type === 'daily-tasks' ? '#FDF4FF' : '#FFFBEB');
  const scrollColor = darkenColor(bgColor, 20);
  const scrollColorHover = darkenColor(bgColor, 35);

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _direction, _ref, d) => {
        onUpdate(pin.id, {
          width:  pin.width  + d.width,
          height: pin.height + d.height,
        });
      }}
      minWidth={160}
      minHeight={120}
      style={{
        position:   'absolute',
        left:       pin.x,
        top:        pin.y,
        opacity:    isDragging ? 0.75 : 1,
        zIndex:     isDragging ? 9999 : (pin.zIndex ?? 1),
        transform:  isDragging
          ? 'rotate(0deg) scale(1.04)'
          : `rotate(${pin.rotation ?? 0}deg)`,
        transition: isDragging ? 'none' : 'opacity 0.15s, transform 0.2s',
      }}
      enable={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="w-full h-full flex flex-col rounded-xl overflow-hidden"
        onClick={handleBringToFront}
        style={{
          backgroundColor: bgColor,
          boxShadow: isDragging
            ? '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)'
            : '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
          // @ts-ignore
          '--scrollbar-color': scrollColor,
          // @ts-ignore
          '--scrollbar-color-hover': scrollColorHover,
        }}
      >
        {/* Pin Head */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div
            className="w-5 h-5 rounded-full shadow-md"
            style={{ backgroundColor: pinHeadColor }}
          />
          <div
            className="w-1.5 h-2 rounded-b-sm mx-auto"
            style={{ backgroundColor: pinHeadColor, opacity: 0.6 }}
          />
        </div>

        {/* Pin Header */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(pin.id, e);
          }}
          className="flex items-center justify-between px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
          style={{ backgroundColor: getContrastColor(bgColor).includes('slate-50') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className={`w-3.5 h-3.5 ${getContrastColor(bgColor).includes('slate-50') ? 'text-slate-400' : 'text-slate-400'}`} />
            <span className={`text-xs capitalize tracking-wide font-medium ${getContrastColor(bgColor)}`}>
              {pin.type.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Font picker */}
            {(pin.type === 'note' || pin.type === 'countdown' || pin.type === 'todo') && (
              <div className="relative">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowFontPicker(!showFontPicker)}
                  className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${getContrastColor(bgColor).includes('slate-50') ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title="Font options"
                >
                  <Settings2 className={`w-3.5 h-3.5 ${getContrastColor(bgColor).includes('slate-50') ? 'text-slate-300' : 'text-slate-500'}`} />
                </button>
                {showFontPicker && (
                  <div
                    className="absolute top-6 right-0 bg-white rounded-lg shadow-xl border border-slate-200 p-2 space-y-2 z-50 w-36"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                  >
                    <div>
                      <label className="text-slate-600 block mb-1 text-xs">Font:</label>
                      <select
                        value={pin.fontFamily || 'system-ui'}
                        onChange={(e) => {
                          onUpdate(pin.id, { fontFamily: e.target.value });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs mb-2"
                      >
                        <option value="system-ui">Default</option>
                        <option value="'Courier New', monospace">Typewriter</option>
                        <option value="'Comic Sans MS', cursive">Playful</option>
                        <option value="'Georgia', serif">Elegant</option>
                        <option value="'Brush Script MT', cursive">Handwritten</option>
                      </select>

                      <label className="text-slate-600 block mb-1 text-xs">Size:</label>
                      <select
                        value={pin.fontSize || '14px'}
                        onChange={(e) => {
                          onUpdate(pin.id, { fontSize: e.target.value });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                      >
                        <option value="12px">Extra Small</option>
                        <option value="14px">Small</option>
                        <option value="16px">Medium</option>
                        <option value="20px">Large</option>
                        <option value="24px">Extra Large</option>
                        <option value="32px">Huge</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Color picker */}
            {(pin.type === 'note' || pin.type === 'image' || pin.type === 'todo' || pin.type === 'daily-tasks' || pin.type === 'countdown') && (
              <div className="relative">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                >
                  <Palette className={`w-3.5 h-3.5 ${getContrastColor(bgColor).includes('slate-50') ? 'text-slate-300' : 'text-slate-500'}`} />
                </button>
                {showColorPicker && (
                  <div
                    className={`${resolvedTheme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} absolute top-8 right-0 rounded-xl shadow-2xl border p-3 grid grid-cols-6 gap-2 z-50 animate-in fade-in zoom-in duration-150`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                  >
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={`w-6 h-6 rounded-full border transition-all hover:scale-125 hover:shadow-lg ${color === '#FFFFFF' ? 'border-slate-200' : 'border-black/5'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Image controls */}
            {pin.type === 'image' && pin.content && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowImageControls(!showImageControls)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                title="Image controls"
              >
                <ImageIcon className="w-3 h-3 text-slate-500" />
              </button>
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(pin.id)}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Pin Content */}
        <div className="flex-1 overflow-hidden px-3 pb-3 pt-1 min-h-0">
          {pin.type === 'note' && (
            <div className="h-full">
              {isEditingNote ? (
                <textarea
                  ref={textareaRef}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onBlur={handleNoteSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setNoteContent(pin.content);
                      setIsEditingNote(false);
                    } else if (e.key === 'Enter' && e.ctrlKey) {
                      handleNoteSave();
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-full h-full resize-none outline-none bg-transparent placeholder-slate-400 leading-relaxed custom-scrollbar ${getContrastColor(bgColor)}`}
                  placeholder="Pin your motivation here..."
                  style={{
                    fontFamily: pin.fontFamily || 'system-ui',
                    fontSize: pin.fontSize || '14px',
                  }}
                />
              ) : (
                <div
                  onClick={() => setIsEditingNote(true)}
                  className={`w-full h-full cursor-text whitespace-pre-wrap leading-relaxed overflow-auto custom-scrollbar ${getContrastColor(bgColor)}`}
                  style={{
                    minHeight: 40,
                    fontFamily: pin.fontFamily || 'system-ui',
                    fontSize: pin.fontSize || '14px',
                  }}
                >
                  {pin.content || (
                    <span className="text-slate-400">Pin your motivation ✨</span>
                  )}
                </div>
              )}
            </div>
          )}

          {pin.type === 'image' && (
            <div className="h-full flex flex-col gap-2">
              {pin.content ? (
                <div className="relative flex-1 rounded-lg overflow-hidden bg-white/50 border border-black/5">
                  <img
                    src={pin.content}
                    alt="Pin"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: pin.imageObjectFit || 'cover',
                      objectPosition: pin.imageObjectPosition || 'center',
                    }}
                  />
                  {showImageControls && (
                    <div
                      className="absolute top-2 right-2 bg-white/95 rounded-lg shadow-lg p-2 space-y-2 text-xs"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                      }}
                    >
                      <div>
                        <label className="text-slate-600 block mb-1">Fit:</label>
                        <select
                          value={pin.imageObjectFit || 'cover'}
                          onChange={(e) =>
                            onUpdate(pin.id, {
                              imageObjectFit: e.target.value as any,
                            })
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="fill">Fill</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setShowImageInput(true);
                          setShowImageControls(false);
                        }}
                        className="w-full px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs"
                      >
                        Change Image
                      </button>
                    </div>
                  )}
                </div>
              ) : showImageInput ? (
                <div
                  className="flex-1 flex flex-col gap-2 justify-center"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleImageSubmit();
                      if (e.key === 'Escape') setShowImageInput(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-300 bg-white/80"
                    placeholder="Paste image URL..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleImageSubmit}
                      className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Set URL
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div
                  onClick={() => setShowImageInput(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 transition-all bg-white/20"
                >
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-500">Add image</span>
                </div>
              )}
            </div>
          )}

          {pin.type === 'countdown' && (
            <div className="h-full flex flex-col items-center justify-center gap-1">
              <div
                className="text-5xl tabular-nums"
                style={{ color: getContrastColor(bgColor).includes('slate-50') ? '#FFFFFF' : pinHeadColor, fontWeight: 700 }}
              >
                {daysRemaining}
              </div>
              <div className={`text-xs tracking-widest uppercase ${getContrastColor(bgColor).includes('slate-50') ? 'text-slate-300' : 'text-slate-500'}`}>
                days left
              </div>
              {isEditingLabel ? (
                <input
                  ref={labelRef}
                  type="text"
                  value={labelContent}
                  onChange={(e) => setLabelContent(e.target.value)}
                  onBlur={handleLabelSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') handleLabelSave();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="mt-1 text-center text-slate-600 bg-transparent border-b border-slate-300 outline-none w-full max-w-[140px]"
                  style={{
                    fontFamily: pin.fontFamily || 'system-ui',
                    fontSize: pin.fontSize || '12px',
                  }}
                />
              ) : (
                <div
                  onClick={() => setIsEditingLabel(true)}
                  className="mt-1 text-slate-600 cursor-text hover:text-slate-800 transition-colors text-center"
                  style={{
                    fontFamily: pin.fontFamily || 'system-ui',
                    fontSize: pin.fontSize || '12px',
                  }}
                >
                  {pin.label || (
                    <span className="text-slate-400 italic">add label</span>
                  )}
                </div>
              )}
              <input
                type="date"
                value={pin.content}
                onChange={(e) => onUpdate(pin.id, { content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                className="mt-2 text-center text-xs text-slate-400 bg-transparent border border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-slate-300 cursor-pointer"
              />
            </div>
          )}

          {pin.type === 'todo' && (
            <div className="h-full flex flex-col">
              <form onSubmit={handleAddTodo} className="mb-3 flex gap-1.5" onMouseDown={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  placeholder="Add task..."
                  className={`flex-1 px-2 py-1.5 text-sm rounded-lg outline-none focus:ring-1 focus:ring-emerald-400/50 bg-white/20 border border-black/5 ${getContrastColor(bgColor)} placeholder-slate-400`}
                />
                <button type="submit" className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="flex-1 overflow-auto space-y-1.5 pr-1 custom-scrollbar">
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2 group bg-white/30 hover:bg-white/50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-black/5">
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex-shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {todo.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`text-sm flex-1 leading-snug ${todo.completed ? 'opacity-40 line-through' : ''} ${getContrastColor(bgColor)}`}>
                      {todo.text}
                    </span>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {todos.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30 mt-4">
                    <ListTodo className="w-8 h-8" />
                    <span className="text-xs font-medium">No tasks yet</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {pin.type === 'daily-tasks' && (
            <div className="h-full flex flex-col">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ClipboardList className="w-3 h-3" />
                Today's Calendar Sync
              </div>
              <div className="flex-1 overflow-auto space-y-2 pr-1 custom-scrollbar">
                {dailyNotes.map(note => (
                  <div key={note.id} className="bg-white/40 border-l-[3px] border-rose-400 p-2.5 rounded-r-lg shadow-sm">
                    <div className="text-xs font-bold text-rose-500 mb-0.5">
                      {note.dateRange.end ? 'Event/Range' : 'Reminder'}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {note.text}
                    </p>
                  </div>
                ))}
                {dailyNotes.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30 mt-8">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-rose-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-tight">No tasks for today</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Resizable>
  );
}