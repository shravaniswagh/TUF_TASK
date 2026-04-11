import { useState, useEffect } from 'react';
import { PinBoard } from './components/PinBoard';
import { Auth } from './components/Auth';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { THEME_CONFIG } from './theme-config';

export default function App() {
  const [boardId, setBoardId] = useState<string>('default');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // We read the URL directly
  const urlParams = new URLSearchParams(window.location.search);
  const isWallpaperMode = urlParams.has("board") && !urlParams.has("web");

  useEffect(() => {
    // Initial board ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialBoard = urlParams.get('board') || 'default';
    setBoardId(initialBoard);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && !isWallpaperMode) {
        // Use the user's UID as the board ID — but only set it ONCE
        // to avoid stale closure triggering repeated fetchPins
        setBoardId(prev => {
          if (prev !== u.uid) {
            window.history.replaceState({}, '', `/?board=${u.uid}&web=true`);
            return u.uid;
          }
          return prev; // Already set to user's UID — do nothing
        });
      }
      
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isWallpaperMode]);

  // Inject theme variables into :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-bg-light', THEME_CONFIG.backgrounds.light);
    root.style.setProperty('--app-bg-dark', THEME_CONFIG.backgrounds.dark);
    root.style.setProperty('--app-text-light', THEME_CONFIG.text.light);
    root.style.setProperty('--app-text-dark', THEME_CONFIG.text.dark);
    root.style.setProperty('--app-accent', THEME_CONFIG.accent.primary);
  }, []);

  // 1. If it's pure wallpaper mode (URL has board but NO web flag), bypass entirely
  if (isWallpaperMode) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <PinBoard boardId={boardId} />
      </div>
    );
  }

  // 2. Waiting for Firebase Auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 3. Not logged in
  if (!user) {
    return <Auth />;
  }

  // 4. Web user logged in
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PinBoard boardId={boardId} />
    </div>
  );
}