
import React, { useEffect, useState } from 'react';
import Wheel from './Wheel';

interface RaffleDisplayProps {
  participants: string[];
  winner: string | null;
  isSpinning: boolean;
  onSpin: () => void;
  onStopSpin: () => void;
  onReset: () => void;
  onRemoveWinnerEntries: (name: string | null) => void;
  onShuffle: () => void;
  rotation: number;
  tickCount: number;
  raffleTitle: string;
  onRaffleTitleChange: (newTitle: string) => void;
  raffleError: string | null;
  onClearRaffleError: () => void;
}

const RaffleDisplay: React.FC<RaffleDisplayProps> = ({
  participants,
  winner,
  isSpinning,
  onSpin,
  onStopSpin,
  onReset,
  onRemoveWinnerEntries,
  onShuffle,
  rotation,
  tickCount,
  raffleTitle,
  onRaffleTitleChange,
  raffleError,
  onClearRaffleError,
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

  const canSpin = participants.length >= 2 && !isSpinning;

  const renderWinnerOverlay = () => {
    if (!winner) return null;

    return (
      <div className="text-center animate-fade-in absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm rounded-xl z-20">
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
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full text-center">
        <div className={`relative w-full max-w-[1000px] aspect-square`}>
          {participants.length >= 2 && (
            <>
              <div 
                className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-32 h-40 z-10"
                style={{ transformOrigin: 'center 80%'}}
              >
                <div className={flicking ? 'is-flicking' : ''}>
                  <svg viewBox="0 0 70 85" className="drop-shadow-lg">
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
                rotation={rotation}
              />
            </>
          )}
          {renderWinnerOverlay()}
          {renderInstructionsOverlay()}
        </div>

        <div className="flex flex-col items-center w-full" style={{ visibility: winner ? 'hidden' : 'visible' }}>
          <div className="w-full max-w-md mb-4">
            <input
              type="text"
              value={raffleTitle}
              onChange={(e) => onRaffleTitleChange(e.target.value)}
              disabled={isSpinning}
              aria-label="Raffle Name"
              className="w-full bg-transparent text-center text-3xl font-bold text-gray-200 truncate focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md py-1 transition disabled:opacity-70"
              placeholder="Enter raffle name..."
            />
          </div>

          {isSpinning ? (
            <button
              onClick={onStopSpin}
              className="py-4 px-10 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-2xl font-bold rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
            >
              STOP
            </button>
          ) : (
            <button
              onClick={onSpin}
              disabled={!canSpin}
              className="py-4 px-10 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-2xl font-bold rounded-full shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 disabled:hover:scale-100"
            >
              SPIN!
            </button>
          )}
          {participants.length >= 2 && !isSpinning && (
            <button
                onClick={onShuffle}
                disabled={isSpinning}
                className="mt-4 py-2 px-8 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-900 text-sm font-bold rounded-md shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 disabled:hover:scale-100"
                aria-label="Shuffle wheel participants"
            >
                SHUFFLE
            </button>
          )}
        </div>
      </div>
      
      {raffleError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClearRaffleError}>
            <div className="bg-gray-950 p-8 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-6 text-gray-200">{raffleError}</h2>
                <button onClick={onClearRaffleError} className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold transition-colors">
                    OK
                </button>
            </div>
        </div>
      )}

      {showRemoveWinnerConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { onReset(); setShowRemoveWinnerConfirm(false); }}>
            <div className="bg-gray-950 p-8 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-6 text-gray-200">Remove the last Winner?</h2>
                <div className="flex justify-center gap-4">
                  <button 
                      onClick={() => {
                          onRemoveWinnerEntries(winner);
                          setShowRemoveWinnerConfirm(false);
                      }} 
                      className="py-2 px-6 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors"
                  >
                      Yes
                  </button>
                  <button 
                      onClick={() => {
                          onReset();
                          setShowRemoveWinnerConfirm(false);
                      }} 
                      className="py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold transition-colors"
                  >
                      No
                  </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default RaffleDisplay;
