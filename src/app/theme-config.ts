/**
 * THEME CONTROL PANEL
 * 
 * Change the hex codes below to restyle your entire app.
 * No need to touch any other code!
 */

export const THEME_CONFIG = {
  // ── Global Backgrounds ──────────────────────────────────────────
  // These affect the main screen background
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
  // The subtle dots on the board
  dots: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },

  // ── Accent Colors ──────────────────────────────────────────────
  // Used for the + button and primary highlights
  accent: {
    primary: '#3b82f6', // Bright Blue
    hover: '#2563eb',   // Deeper Blue
    glow: 'rgba(59, 130, 246, 0.4)',
  },

  // ── Pin Header Colors ──────────────────────────────────────────
  // The small indicator at the top of each pin type
  pinHeads: {
    note: '#F59E0B',
    image: '#10B981',
    countdown: '#6366F1',
    calendar: '#6366F1',
    todo: '#10B981',
    'daily-tasks': '#F43F5E',
  },

  // ── Pin Palette (The colors in the palette menu) ───────────────
  // You can add or remove colors here
  pinPalette: [
    '#FFFFFF', '#F8FAFC', '#F1F5F9', // Premium Whites/Grays
    '#FFFBEB', '#FEF3C7', '#FDF4FF', // Warm/Soft Clean
    '#E2E8F0', '#94A3B8', '#475569', // Professional Slates
    '#334155', '#1E293B', '#0F172A', // Deep Midnights
    '#020617', '#18181B', '#27272A', // Obsidian/Zincs
    '#3F3F46', '#52525B', '#71717A', // Industrial Grays
  ],

  // ── Board Palette (Pastel Backgrounds) ─────────────────────────
  boardPalette: [
    { name: 'Default', color: null },
    { name: 'Rose', color: '#FFF1F2' },   // Soft Pink
    { name: 'Lavender', color: '#F5F3FF' }, // Soft Purple
    { name: 'Matcha', color: '#F0FDF4' },   // Mint Green
    { name: 'Sky', color: '#EFF6FF' },      // Soft Blue
    { name: 'Cream', color: '#FEFCE8' },    // Soft Yellow
    { name: 'Slate', color: '#F8FAFC' },    // Light Slate
    { name: 'Midnight', color: '#0F172A' }, // Deep Navy
    { name: 'Obsidian', color: '#050505' }, // Deep Black
  ]
};
