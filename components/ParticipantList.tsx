import React from 'react';
import { TrashIcon } from './icons';

interface ParticipantListProps {
  participants: string[];
  onRemoveParticipant: (index: number) => void;
  onClearAll: () => void;
  isSpinning: boolean;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, onRemoveParticipant, onClearAll, isSpinning }) => {
  const listClassName = `space-y-2 overflow-y-auto flex-grow pr-2 ${
    participants.length > 17 ? 'columns-2 gap-x-4' : ''
  }`;
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-slate-300">
          Participants ({participants.length})
        </h2>
        <button
          onClick={onClearAll}
          disabled={isSpinning || participants.length === 0}
          className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md transition-colors duration-200 disabled:bg-red-800/50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
      </div>
      {participants.length > 0 ? (
         <ul className={listClassName}>
          {participants.map((participant, index) => (
            <li
              key={`${participant}-${index}`} // More robust key
              className="flex items-center justify-between bg-slate-700/50 rounded-md px-4 py-2 animate-fade-in break-inside-avoid"
            >
              <span className="text-slate-200 truncate">{participant}</span>
              <button
                onClick={() => onRemoveParticipant(index)}
                disabled={isSpinning}
                className="text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Remove ${participant}`}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-grow flex items-center justify-center text-slate-500 text-center">
            <p>Add some names to get started!</p>
        </div>
      )}
    </div>
  );
};

export default ParticipantList;