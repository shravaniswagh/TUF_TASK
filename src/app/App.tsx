import { PinBoard } from './components/PinBoard';

export default function App() {
  return (
    <div
      style={{
        position:   'relative',
        width:      '100vw',
        height:     '100vh',
        overflow:   'hidden',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PinBoard />
    </div>
  );
}