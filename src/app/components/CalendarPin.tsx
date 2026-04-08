import { useState, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { X, GripVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { WallCalendar } from './WallCalendar';
import { PinData } from './Pin';

interface CalendarPinProps {
  pin: PinData;
  onUpdate: (id: string, updates: Partial<PinData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
}

export function CalendarPin({ pin, onUpdate, onDelete, onDragStart, isDragging = false }: CalendarPinProps) {
  const handleBringToFront = () => {
    onUpdate(pin.id, { zIndex: Date.now() });
  };

  // No rotation for calendar - keep it straight
  useEffect(() => {
    if (pin.rotation === undefined) {
      onUpdate(pin.id, { rotation: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Resizable
      size={{ width: pin.width, height: pin.height }}
      onResizeStop={(_e, _direction, _ref, d) => {
        onUpdate(pin.id, {
          width:  pin.width  + d.width,
          height: pin.height + d.height,
        });
      }}
      minWidth={400}
      minHeight={500}
      style={{
        position:   'absolute',
        left:       pin.x,
        top:        pin.y,
        opacity:    isDragging ? 0.85 : 1,
        zIndex:     isDragging ? 9999 : (pin.zIndex ?? 100),
        transform:  isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'opacity 0.15s, transform 0.2s',
      }}
      enable={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="w-full h-full flex flex-col rounded-xl overflow-hidden"
        onClick={handleBringToFront}
        style={{
          backgroundColor: '#ffffff',
          boxShadow: isDragging
            ? '0 24px 48px rgba(0,0,0,0.2), 0 12px 24px rgba(0,0,0,0.15)'
            : '0 4px 20px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Calendar Pin Head */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div
            className="w-5 h-5 rounded-full shadow-md"
            style={{ backgroundColor: '#EF4444' }}
          />
          <div
            className="w-1.5 h-2 rounded-b-sm mx-auto"
            style={{ backgroundColor: '#EF4444', opacity: 0.6 }}
          />
        </div>

        {/* Drag Handle Header */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(pin.id, e);
          }}
          className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing shrink-0 bg-slate-50 border-b border-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 capitalize tracking-wide font-medium">
              Calendar
            </span>
          </div>
          {/* Calendar is permanent - no delete button */}
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto min-h-0">
          <WallCalendar isFullscreen={false} />
        </div>
      </motion.div>
    </Resizable>
  );
}