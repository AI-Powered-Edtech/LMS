// CSS-based Confetti Component
// Zero bundle impact - uses pure CSS animations

export function Confetti() {
  return (
    <div className="confetti-container" aria-hidden="true">
      <div className="confetti confetti-1" />
      <div className="confetti confetti-2" />
      <div className="confetti confetti-3" />
      <div className="confetti confetti-4" />
      <div className="confetti confetti-5" />
      <div className="confetti confetti-6" />
      <div className="confetti confetti-7" />
      <div className="confetti confetti-8" />
      <div className="confetti confetti-9" />
      <div className="confetti confetti-10" />
      <div className="confetti confetti-11" />
      <div className="confetti confetti-12" />
      <style>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 100;
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -20px;
          opacity: 0;
          animation: confetti-fall 3s ease-out forwards;
        }
        
        .confetti-1 { left: 5%; background: #ef4444; animation-delay: 0s; }
        .confetti-2 { left: 10%; background: #f97316; animation-delay: 0.1s; }
        .confetti-3 { left: 15%; background: #eab308; animation-delay: 0.2s; }
        .confetti-4 { left: 20%; background: #22c55e; animation-delay: 0.3s; }
        .confetti-5 { left: 25%; background: #06b6d4; animation-delay: 0.4s; }
        .confetti-6 { left: 30%; background: #3b82f6; animation-delay: 0.5s; }
        .confetti-7 { left: 35%; background: #8b5cf6; animation-delay: 0.6s; }
        .confetti-8 { left: 40%; background: #ec4899; animation-delay: 0.7s; }
        .confetti-9 { left: 45%; background: #ef4444; animation-delay: 0.8s; }
        .confetti-10 { left: 50%; background: #f97316; animation-delay: 0.9s; }
        .confetti-11 { left: 55%; background: #eab308; animation-delay: 1s; }
        .confetti-12 { left: 60%; background: #22c55e; animation-delay: 1.1s; }
        
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
