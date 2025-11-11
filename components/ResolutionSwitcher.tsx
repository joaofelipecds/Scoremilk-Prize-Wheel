
import React from 'react';
import { EnterFullScreenIcon, ExitFullScreenIcon } from './icons';

interface ResolutionSwitcherProps {
  isScaled: boolean;
  onToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const ResolutionSwitcher: React.FC<ResolutionSwitcherProps> = ({
  isScaled,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const buttonText = isScaled ? 'Adjust to screen size' : 'Use Scaled View';
  const ariaLabel = isScaled ? 'Switch to fit screen size' : 'Switch to scaled view';

  return (
    <div className="fixed top-4 left-4 z-50 flex gap-2">
      <button
        onClick={onToggle}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 text-lg rounded-lg shadow-lg transition-colors duration-200"
        aria-label={ariaLabel}
      >
        {buttonText}
      </button>
      <button
        onClick={onToggleFullscreen}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold p-3 text-lg rounded-lg shadow-lg transition-colors duration-200"
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
      >
        {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
      </button>
    </div>
  );
};

export default ResolutionSwitcher;
