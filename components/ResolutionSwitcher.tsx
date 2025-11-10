import React from 'react';

interface ResolutionSwitcherProps {
  currentResolution: '1920x1080' | '1366x768';
  onToggleResolution: () => void;
}

const ResolutionSwitcher: React.FC<ResolutionSwitcherProps> = ({
  currentResolution,
  onToggleResolution,
}) => {
  const nextResolution = currentResolution === '1920x1080' ? '1366x768' : '1920x1080';

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={onToggleResolution}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-colors duration-200"
        aria-label={`Switch resolution to ${nextResolution}`}
      >
        Switch to {nextResolution}
      </button>
    </div>
  );
};

export default ResolutionSwitcher;
