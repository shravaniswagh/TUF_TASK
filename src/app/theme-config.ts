/**
 * THEME CONTROL PANEL
 * 
 * Change the hex codes below to restyle your entire app.
 * No need to touch any other code!
 */

export const THEME_CONFIG = {
  // ── Global Backgrounds ──────────────────────────────────────────
  backgrounds: {
    light: '#f8fafc', // Soft Slate-50
    dark: '#050505',  // Premium Deep Black
  },

  // ── Text Colors ────────────────────────────────────────────────
  text: {
    light: '#0f172a', // Slate-900
    dark: '#f1f5f9',  // Slate-50
  },

  // ── Background Dot Grid ────────────────────────────────────────
  dots: {
    light: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(255, 255, 255, 0.12)',
  },

  // ── Accent Colors ──────────────────────────────────────────────
  accent: {
    primary: '#3b82f6', // Bright Blue
    hover: '#2563eb',   // Deeper Blue
    glow: 'rgba(59, 130, 246, 0.4)',
  },

  // ── Pin Header Colors ──────────────────────────────────────────
  pinHeads: {
    note: '#F59E0B',
    image: '#10B981',
    countdown: '#6366F1',
    calendar: '#6366F1',
    todo: '#10B981',
    'daily-tasks': '#6366F1', // Professional Indigo instead of Rose
  },

  // ── Pin Palette (The colors in the palette menu) ───────────────
  pinPalette: [
    // Row 1: Ultra-Light Pastels (Level 50)
    '#FFF1F2', '#FFFBEB', '#F0FDF4', '#EFF6FF', '#F5F3FF', '#FAFAFA',
    // Row 2: Soft Tints (Level 100)
    '#FFE4E6', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#EDE9FE', '#F4F4F5',
    // Row 3: Delicate Mid-tones (Level 200)
    '#FECACA', '#FDE68A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#E4E4E7',
    // Row 4: Bright Accents (Level 300-400)
    '#FDA4AF', '#FCD34D', '#6EE7B7', '#93C5FD', '#C4B5FD', '#D4D4D8',
    // Row 5: Vibrant & Rich (Level 400-500)
    '#FB7185', '#FACC15', '#34D399', '#60A5FA', '#A78BFA', '#A1A1AA',
  ],

  // ── Board Palettes (Mode-Specific) ─────────────────────────────
  boardPalettes: {
    light: [
      { name: 'Default', color: null },
      { name: 'Paper', color: '#F3F4F6' },    // Clean Warm Gray (Default Look)
      { name: 'Azure', color: '#F0F9FF' },    // Premium Soft Blue
      { name: 'Sakura', color: '#FFF5F7' },   // Premium Soft Pink
      { name: 'Lavender', color: '#F9F5FF' }, // Premium Soft Purple
      { name: 'Matcha', color: '#F7FEE7' },   // Premium Soft Green
    ],
    dark: [
      { name: 'Default', color: null },
      { name: 'Midnight', color: '#0F172A' }, // Deep Professional Navy
      { name: 'Forest', color: '#064E3B' },   // Deep Forest Green
      { name: 'Merlot', color: '#2E1065' },   // Deep Royal Purple
      { name: 'Slate', color: '#1E293B' },    // Rich Charcoal Gray
      { name: 'Obsidian', color: '#050505' }, // Deep Pure Black
    ]
  }
};
