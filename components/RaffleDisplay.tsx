import React, { useEffect, useState } from 'react';
import Wheel from './Wheel';

interface RaffleDisplayProps {
  participants: string[];
  originalParticipants: string[];
  winner: string | null;
  isSpinning: boolean;
  isReturning: boolean;
  onSpin: () => void;
  onStopSpin: () => void;
  onReset: () => void;
  onRemoveWinnerEntries: (name: string | null) => void;
  rotation: number;
  tickCount: number;
  isFullscreen: boolean;
}

const RaffleDisplay: React.FC<RaffleDisplayProps> = ({
  participants,
  originalParticipants,
  winner,
  isSpinning,
  isReturning,
  onSpin,
  onStopSpin,
  onReset,
  onRemoveWinnerEntries,
  rotation,
  tickCount,
  isFullscreen,
}) => {
  const [flicking, setFlicking] = useState(false);
  const [showRemoveWinnerConfirm, setShowRemoveWinnerConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (tickCount > 0 && isSpinning) {
      setFlicking(true);
      const timer = setTimeout(() => setFlicking(false), 100);
      return () => clearTimeout(timer);
    }
  }, [tickCount, isSpinning]);

  // When the winner is cleared (raffle is reset), also hide the confirmation modal.
  useEffect(() => {
    if (!winner) {
      setShowRemoveWinnerConfirm(false);
    }
  }, [winner]);


  const canSpin = participants.length >= 2 && !isSpinning && !isReturning;

  const handleWheelClick = () => {
    if (isReturning) return;
    if (isSpinning) {
      onStopSpin();
    } else if (canSpin) {
      onSpin();
    }
  };

  const renderWinnerOverlay = () => {
    if (!winner) return null;

    return (
      <div 
        className="text-center animate-fade-in absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm rounded-xl z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl text-gray-400">The winner is...</h3>
        <p className="text-4xl sm:text-6xl font-bold my-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 animate-pulse">
          {winner}
        </p>
        <button
          onClick={() => onRemoveWinnerEntries(winner)}
          className="mt-6 py-2 px-6 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-transform duration-200 hover:scale-105"
        >
          Remove Winner
        </button>
        <button
          onClick={() => setShowRemoveWinnerConfirm(true)}
          className="mt-3 py-2 px-5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-transform duration-200 hover:scale-105"
        >
          Spin Again
        </button>
      </div>
    );
  };
  
  const renderInstructionsOverlay = () => {
     if (participants.length >= 2 || isSpinning) return null;
     
     return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 rounded-xl z-10">
            <h2 className="text-2xl font-bold text-gray-300">Ready to Spin?</h2>
            <p className="text-gray-400 mt-2">Add at least 2 participants.</p>
        </div>
     );
  };

  return (
    <>
      <div
        className="relative w-full h-full flex items-center justify-center"
      >
        <div className="relative w-auto h-full" style={{ aspectRatio: '1 / 1' }}>
          {participants.length >= 2 && (
            <>
              <div 
                className={`absolute bottom-[93%] left-1/2 -translate-x-1/2 z-10 w-[clamp(4rem,12vh,8rem)]`}
                style={{ transformOrigin: 'center 80%' }}
              >
                <div className={flicking ? 'is-flicking' : ''}>
                  <svg viewBox="0 0 70 85" className="drop-shadow-lg w-full h-full">
                      <defs>
                          <linearGradient id="pointer-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{stopColor: '#cbd5e1', stopOpacity: 1}} />
                              <stop offset="50%" style={{stopColor: '#f1f5f9', stopOpacity: 1}} />
                              <stop offset="100%" style={{stopColor: '#64748b', stopOpacity: 1}} />
                          </linearGradient>
                          <filter id="pointer-shadow" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
                          </filter>
                      </defs>
                      <path d="M35 85 L5 40 C 5 20, 65 20, 65 40 Z" fill="url(#pointer-gradient)" filter="url(#pointer-shadow)" />
                  </svg>
                </div>
              </div>
            
              <Wheel 
                participants={participants}
                originalParticipants={originalParticipants}
                rotation={rotation}
                onClick={handleWheelClick}
                clickable={canSpin || isSpinning}
              />
            </>
          )}
          {renderWinnerOverlay()}
          {renderInstructionsOverlay()}
        </div>
      </div>
      
      {showRemoveWinnerConfirm && winner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowRemoveWinnerConfirm(false)}>
            <div className="bg-gray-950 p-8 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-gray-200">Remove Winner?</h2>
                <p className="text-gray-400 mb-6">Do you want to remove "{winner}" from the participant list before the next spin?</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => {
                            onRemoveWinnerEntries(winner);
                            setShowRemoveWinnerConfirm(false);
                        }} 
                        className="py-2 px-6 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors"
                    >
                        Yes, Remove
                    </button>
                    <button 
                        onClick={() => {
                            onReset();
                            setShowRemoveWinnerConfirm(false);
                        }} 
                        className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold transition-colors"
                    >
                        No, Keep
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default RaffleDisplay;