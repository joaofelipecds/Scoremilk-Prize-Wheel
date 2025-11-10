
import React from 'react';

interface ResolutionSwitcherProps {
  isScaled: boolean;
  onToggle: () => void;
}

const ResolutionSwitcher: React.FC<ResolutionSwitcherProps> = ({
  isScaled,
  onToggle,
}) => {
  const buttonText = isScaled ? 'Adjust to screen size' : 'Use Scaled View';
  const ariaLabel = isScaled ? 'Switch to fit screen size' : 'Switch to scaled view';

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={onToggle}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 text-lg rounded-lg shadow-lg transition-colors duration-200"
        aria-label={ariaLabel}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ResolutionSwitcher;
