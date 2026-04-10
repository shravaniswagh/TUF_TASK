import { useState, useEffect } from 'react';
import { PinBoard } from './components/PinBoard';
import { Auth } from './components/Auth';
import { auth } from '../firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { LogOut, Copy, Check } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // We read the URL directly
  const urlParams = new URLSearchParams(window.location.search);
  const isWallpaperMode = urlParams.has("board") && !urlParams.has("web");
  const urlBoardId = urlParams.get("board");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && !isWallpaperMode) {
         // Force their UID into the URL so PinBoard and WallCalendar hooks catch it
         window.history.replaceState({}, '', `/?board=${u.uid}&web=true`);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isWallpaperMode]);

  const handleCopyUrl = () => {
    if (user) {
      const url = `${window.location.origin}/?board=${user.uid}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. If it's pure wallpaper mode (URL has board but NO web flag), bypass entirely
  if (isWallpaperMode) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-50">
        <PinBoard />
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
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
         <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:inline">Wallpaper URL:</span>
         <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded text-blue-500 font-mono">
           {window.location.origin}/?board={user.uid.substring(0, 8)}...
         </code>
         <button 
           onClick={handleCopyUrl}
           className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
           title="Copy full URL to your wallpaper app"
         >
           {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
         </button>
         <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-2" />
         <button 
           onClick={() => {
              signOut(auth);
              window.history.replaceState({}, '', `/`);
           }}
           className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium whitespace-nowrap"
         >
           <LogOut className="w-4 h-4" />
           <span className="hidden md:inline">Sign Out</span>
         </button>
      </div>

      {/* PinBoard will inherently read the ?board=uid from the replaced URL! */}
      <PinBoard />
    </div>
  );
}