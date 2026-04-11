import { useState, useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { X, GripVertical, Palette, Settings, Image as ImageIcon, PaintBucket, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WallCalendar } from './WallCalendar';
import { PinData } from './Pin';
import { THEME_CONFIG } from '../theme-config';

const CALENDAR_COLORS = [
  '#FFFFFF', '#FFFBEB', '#FEF3C7', '#FDE68A',
  '#EFF6FF', '#DBEAFE', '#BFDBFE',
  '#FDF4FF', '#FAE8FF', '#F5D0FE',
  '#F0FDF4', '#DCFCE7', '#BBF7D0',
  '#FFF1F2', '#FFE4E6', '#FECDD3',
];

const CURVE_COLORS = [
  '#5B9BD5', '#4B8BBD', '#3B7BAB', // Blues
  '#10B981', '#059669', '#047857', // Greens
  '#F59E0B', '#D97706', '#B45309', // Ambers
  '#EF4444', '#DC2626', '#B91C1C', // Reds
  '#8B5CF6', '#7C3AED', '#6D28D9', // Violets
  '#334155', '#1E293B', '#0F172A', // Slate/Dark
];

interface CalendarPinProps {
  pin: PinData;
  boardId: string;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  isDark: boolean;
  isLocked: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onOpenInspector?: (id: string) => void;
  onBringToFront: (id: string) => void;
}

export function CalendarPin({ pin, boardId, onUpdate, onDelete, onDragStart, onOpenInspector, isDragging = false, isDark, isLocked, isSelected, onSelect, onBringToFront }: CalendarPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? 'text-slate-600' : 'text-white';
  };
  const textColorClass = getContrastColor(pin.color || '#ffffff');

  const handleBringToFront = () => {
    onBringToFront(pin.id);
  };
  
  // No rotation for calendar - keep it straight
  useEffect(() => {
    if (pin.rotation === undefined) {
      onUpdate(pin.id, { rotation: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [lockedRatio, setLockedRatio] = useState<number | boolean>(false);
  const zoomLevel = pin.height / 600;

  return (
    <Resizable
      lockAspectRatio={lockedRatio}
      onResizeStart={(_e, direction) => {
        const isCorner = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(direction);
        if (isCorner) {
          setLockedRatio(pin.width / pin.height);
        } else {
          setLockedRatio(false);
        }
      }}
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _direction, _ref, d) => {
        if (isLocked) return;
        onUpdate(pin.id, {
          width:  pin.width  + d.width,
          height: pin.height + d.height,
        });
      }}
      minWidth={400}
      minHeight={300}
      style={{
        position:   'absolute',
        left:       pin.x,
        top:        pin.y,
        opacity:    isDragging ? 0.85 : 1,
        zIndex:     isDragging ? 1000 : (pin.zIndex ?? 100),
        transform:  isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'opacity 0.15s, transform 0.2s',
      }}
      enable={isLocked ? false : {
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
    >
      {/* Calendar Pin Head - Move outside the overflow-hidden container */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <div
          className="w-5 h-5 rounded-full shadow-md"
          style={{ backgroundColor: THEME_CONFIG.accent.primary }}
        />
        <div
          className="w-1.5 h-2 rounded-b-sm mx-auto"
          style={{ backgroundColor: THEME_CONFIG.accent.primary, opacity: 0.6 }}
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`w-full h-full flex flex-col rounded-xl transition-all duration-300 ${isSelected ? 'shadow-2xl' : 'shadow-sm'} border border-black/5`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
          handleBringToFront();
        }}
        style={{
          backgroundColor: isDark ? '#ffffff' : (pin.color || '#ffffff'),
          boxShadow: isSelected
            ? '0 24px 48px rgba(0,0,0,0.2), 0 12px 24px rgba(0,0,0,0.15)'
            : (isDragging ? '0 24px 48px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.12)'),
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div className="w-full h-full flex flex-col overflow-hidden rounded-xl">
        {/* Drag Handle Header */}
          <div
            className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 border-b border-black/5"
            style={{ backgroundColor: textColorClass.includes('black') ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.08)' }}
          >
          <div 
            onMouseDown={(e) => {
              if (isLocked) return;
              e.preventDefault();
              e.stopPropagation();
              onDragStart(pin.id, e);
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing grow"
          >
            <GripVertical className={`w-3.5 h-3.5 text-slate-400`} />
            <span className={`text-xs capitalize tracking-wide font-medium ${textColorClass}`}>Calendar</span>
          </div>
          
          <div className="flex items-center gap-1">
            <AnimatePresence>
              {isHovered && !isLocked && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); onOpenInspector?.(pin.id); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 transition-all`}
                >
                  <Settings2 className={`w-4 h-4 ${textColorClass}`} />
                </motion.button>
              )}
            </AnimatePresence>
            {!isLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(pin.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-black/10 transition-colors"
                aria-label="Close calendar"
              >
                <X className={`w-4 h-4 ${textColorClass}`} />
              </button>
            )}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden min-h-0 relative rounded-b-xl bg-white">
          <WallCalendar 
            boardId={boardId}
            isFullscreen={false} 
            onSidebarToggle={(isCollapsed) => {
              const expansionAmount = 300;
              if (!isCollapsed) {
                // Expanding
                onUpdate(pin.id, { width: pin.width + expansionAmount });
              } else {
                // Collapsing
                onUpdate(pin.id, { width: Math.max(400, pin.width - expansionAmount) });
              }
            }}
            headerImage={pin.headerImage}
            curveColor={pin.curveColor}
            backgroundColor={isDark ? '#ffffff' : (pin.color || '#ffffff')}
            zoomLevel={zoomLevel}
            isDark={isDark}
          />
        </div>
      </div>
    </motion.div>
    </Resizable>
  );
}