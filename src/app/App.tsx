import { useState, useEffect } from 'react';
import { PinBoard } from './components/PinBoard';
import { Auth } from './components/Auth';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

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
         // Force their UID into the URL
         window.history.replaceState({}, '', `/?board=${u.uid}&web=true`);
         setBoardId(u.uid);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isWallpaperMode]);

  // 1. If it's pure wallpaper mode (URL has board but NO web flag), bypass entirely
  if (isWallpaperMode) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-50">
        <PinBoard boardId={boardId} />
      </div>
    );
  }

  // 2. Waiting for Firebase Auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex items-center justify-center">
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-50">
      <PinBoard boardId={boardId} />
    </div>
  );
}