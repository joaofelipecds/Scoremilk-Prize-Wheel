
import React, { useState } from 'react';
import { PlusIcon, ListIcon, TrophyIcon, MusicOnIcon, MusicOffIcon, EnterFullScreenIcon, ExitFullScreenIcon } from './icons';

interface ParticipantInputProps {
  onAddParticipant: (name: string) => void;
  onAddMultipleParticipants: (names: string[]) => void;
  disabled: boolean;
  winnerHistory: { winnerName: string; raffleTitle: string; timestamp: number }[];
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullScreen: () => void;
}

const ParticipantInput: React.FC<ParticipantInputProps> = ({
  onAddParticipant,
  onAddMultipleParticipants,
  disabled,
  winnerHistory,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullScreen,
}) => {
  const [name, setName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWinnersModalOpen, setIsWinnersModalOpen] = useState(false);
  const [listText, setListText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddParticipant(name);
      setName('');
    }
  };

  const handleAddList = () => {
    const names = listText
      .split(/[\n,;]+/)
      .map(name => {
        // Remove special characters, allowing alphanumeric, spaces, hyphens, and dollar signs
        return name.replace(/[^a-zA-Z0-9\s\-$]/g, '')
                   .replace(/\s+/g, ' ') // Collapse multiple spaces
                   .trim();
      })
      .filter(Boolean); // Filter out any names that are empty after cleaning
    
    if (names.length > 0) {
      onAddMultipleParticipants(names);
    }
    setIsModalOpen(false);
    setListText('');
  };

  const now = Date.now();
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  const recentWinners = winnerHistory.filter(w => w.timestamp >= twoHoursAgo);

  // FIX: Explicitly type `winnersByRaffle` to prevent `Object.entries` from returning `[string, unknown][]`.
  // The result of `reduce` can be inferred as a generic `object`,
  // causing `Object.entries` to return `[string, unknown][]`. Explicitly
  // typing the `winnersByRaffle` constant and the initial accumulator value
  // ensures `winnersByRaffle` gets the correct type of `Record<string, string[]>`.
  const winnersByRaffle: Record<string, string[]> = recentWinners.reduce((acc, current) => {
    const title = current.raffleTitle.trim() || 'Untitled Raffle';
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(current.winnerName);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
          disabled={disabled}
          className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 min-w-[100px]"
        />
        <button
          type="submit"
          disabled={disabled || !name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md flex items-center gap-2 transition-colors duration-200 disabled:bg-indigo-800/50 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          <span>Add</span>
        </button>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md flex items-center gap-2 transition-colors duration-200 disabled:bg-purple-800/50 disabled:cursor-not-allowed"
        >
          <ListIcon />
          <span>Add List</span>
        </button>
        <button
          type="button"
          onClick={() => setIsWinnersModalOpen(true)}
          disabled={disabled}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-md flex items-center gap-2 transition-colors duration-200 disabled:bg-amber-700/50 disabled:cursor-not-allowed"
        >
          <TrophyIcon />
          <span>See Winners</span>
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          disabled={disabled}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-md flex items-center justify-center transition-colors duration-200 disabled:bg-emerald-800/50 disabled:cursor-not-allowed"
          aria-label={isMuted ? 'Unmute background sound' : 'Mute background sound'}
        >
          {isMuted ? <MusicOffIcon /> : <MusicOnIcon />}
        </button>
        <button
          type="button"
          onClick={onToggleFullScreen}
          disabled={disabled}
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold p-2 rounded-md flex items-center justify-center transition-colors duration-200 disabled:bg-sky-800/50 disabled:cursor-not-allowed"
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        >
          {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
        </button>
      </form>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2 text-slate-200">Add a List of Names</h2>
                <p className="text-slate-400 mb-4 text-sm">Paste a list of names. They can be separated by new lines, commas, or semicolons.</p>
                <textarea
                    value={listText}
                    onChange={(e) => setListText(e.target.value)}
                    className="w-full h-40 bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    placeholder={`Alice, Bob\nCharlie; Diana`}
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setIsModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-700 rounded-md text-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleAddList} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition-colors disabled:bg-purple-800/50" disabled={!listText.trim()}>Add Names</button>
                </div>
            </div>
        </div>
      )}

      {isWinnersModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsWinnersModalOpen(false)}>
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-200">Recent Winners (Last 2 Hours)</h2>
                {Object.keys(winnersByRaffle).length > 0 ? (
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {Object.entries(winnersByRaffle).map(([title, winners]) => (
                      <div key={title}>
                        <h3 className="font-semibold text-purple-400 border-b border-slate-600 pb-1 mb-2">{title}</h3>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {winners.map((winner, index) => (
                            <li key={`${winner}-${index}`}>{winner}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No winners have been recorded in the last 2 hours.</p>
                )}
                <div className="flex justify-end mt-6">
                    <button onClick={() => setIsWinnersModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-700 rounded-md text-slate-200 transition-colors">Close</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default ParticipantInput;
