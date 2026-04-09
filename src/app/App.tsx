import { PinBoard } from './components/PinBoard';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-50">
      <PinBoard />
    </div>
  );
}