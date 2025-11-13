import React, { useMemo } from 'react';

interface WheelProps {
  participants: string[];
  originalParticipants: string[];
  rotation: number;
  onClick: () => void;
  clickable: boolean;
}

const Wheel: React.FC<WheelProps> = ({ participants, rotation, originalParticipants, onClick, clickable }) => {
  const numParticipants = participants.length;
  
  if (numParticipants === 0) return null;

  const segmentAngle = 360 / numParticipants;
  const radius = 420;
  const center = 500;

  // By memoizing the random start hue, it remains constant for the lifetime of the component,
  // ensuring that the color sequence is stable during re-renders (like wheel spinning),
  // but it will be different every time the page is loaded.
  const [randomStartHue] = useMemo(() => [Math.random() * 360], []);


  // Memoize the segments and text to prevent recalculation on every render during spin
  const segments = useMemo(() => {
    
    // Create a color generation function inside useMemo to ensure stable colors for a given participant list.
    const getColorForIndex = (idx: number): string => {
      // Specific rule for 2 participants: blue and red
      if (numParticipants === 2) {
        return idx === 0 ? '#3b82f6' : '#ef4444';
      }
      
      // Specific rules for the first seven participants
      if (idx === 0) return '#3b82f6'; // name 1: blue
      if (idx === 1) return '#ef4444'; // name 2: red
      if (idx === 2) return '#eab308'; // name 3: yellow
      if (idx === 3) return '#22c55e'; // name 4: green
      if (idx === 4) return '#8b5cf6'; // name 5: purple
      if (idx === 5) return '#ec4899'; // name 6: pink
      if (idx === 6) return '#f97316'; // name 7: orange

      // For all other participants (from the 8th onwards), generate unique colors
      // to avoid any repetition, no matter how many participants are added.
      const effectiveIndex = idx - 7;
      
      // We use the golden angle approximation (137.5 degrees) to ensure that
      // each new color is placed in the largest remaining gap in the color spectrum,
      // creating a pleasant, non-clashing, and infinitely varied palette.
      // The starting hue for this sequence is randomized on each page load.
      const hue = (randomStartHue + effectiveIndex * 137.5) % 360;

      // We also alternate saturation and lightness slightly to increase visual distinction.
      const saturation = effectiveIndex % 2 === 0 ? 80 : 70;
      const lightness = effectiveIndex % 2 === 0 ? 55 : 60;

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    return participants.map((participant, index) => {
      // Find the participant's original index to get a stable color
      const originalIndex = originalParticipants.findIndex(p => p === participant);
      const colorIndex = originalIndex !== -1 ? originalIndex : index; // Use original index for color

      const startAngle = segmentAngle * index;
      const endAngle = startAngle + segmentAngle;

      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;

      const start = { x: center + Math.cos(startRad) * radius, y: center + Math.sin(startRad) * radius };
      const end = { x: center + Math.cos(endRad) * radius, y: center + Math.sin(endRad) * radius };

      const largeArcFlag = segmentAngle > 180 ? 1 : 0;
      const pathData = `M${center},${center} L${start.x},${start.y} A${radius},${radius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;

      const textAngle = startAngle + segmentAngle / 2;
      
      // This logic ensures text is always radial and readable (not upside-down)
      const textRotation = textAngle + (textAngle > 90 && textAngle < 270 ? -90 : 90);

      const textAngleRad = (textAngle - 90) * Math.PI / 180;
      const textRadius = radius * 0.55; // Position text in the middle of the segment radius
      const textPos = { x: center + Math.cos(textAngleRad) * textRadius, y: center + Math.sin(textAngleRad) * textRadius };
      
      const fillColor = getColorForIndex(colorIndex); // Use the stable index for color

      const separatorAngleRad = (endAngle - 90) * Math.PI / 180;
      const separatorEnd = {
        x: center + Math.cos(separatorAngleRad) * radius,
        y: center + Math.sin(separatorAngleRad) * radius,
      };
      
      const fontSize = numParticipants > 16 ? 24 : numParticipants > 10 ? 28 : 32;
      
      const textProps: React.SVGProps<SVGTextElement> = {
          x: textPos.x,
          y: textPos.y,
          transform: `rotate(${textRotation}, ${textPos.x}, ${textPos.y})`,
          dy: "0.35em",
          fill: "white",
          fontSize: fontSize,
          fontFamily: "Comic Sans MS, sans-serif",
          fontWeight: "400",
          textAnchor: "middle",
          className: "select-none tracking-wide",
          style: { 
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          },
      };

      // In a radial layout, the available length is a large portion of the radius
      const availableTextWidth = radius * 0.8; 

      const estimatedNaturalWidth = participant.length * fontSize * 0.6;

      if (estimatedNaturalWidth > availableTextWidth) {
          textProps.textLength = availableTextWidth;
          textProps.lengthAdjust = "spacingAndGlyphs";
      }

      return (
        <g key={index}>
          <path d={pathData} fill={fillColor} stroke="none" />
           { numParticipants > 1 &&
            <line 
              x1={center} 
              y1={center} 
              x2={separatorEnd.x} 
              y2={separatorEnd.y} 
              stroke="white" 
              strokeWidth="3"
              opacity="0.5"
            />
          }
          <text {...textProps}>
            {participant}
          </text>
        </g>
      );
    });
  }, [participants, segmentAngle, numParticipants, randomStartHue, originalParticipants]);

  // Memoize the lights to prevent re-calculating random animation delays on every frame.
  // This ensures the blinking animation remains consistent while the wheel is spinning.
  const lights = useMemo(() => {
    const lightElements = [];
    const numLights = 36;
    const animationDuration = 4.0; // Matches the title CSS animation duration

    // Sequential delays to create a wave effect
    const delays = Array.from({ length: numLights }, (_, i) => 
        (i / numLights) * animationDuration
    );

    const lightSegmentAngle = 360 / numLights;
    for (let i = 0; i < numLights; i++) {
        const lightAngle = lightSegmentAngle * i;
        const lightAngleRad = (lightAngle - 90) * Math.PI / 180;
        const lightRadius = 480;
        const lightPos = { x: center + Math.cos(lightAngleRad) * lightRadius, y: center + Math.sin(lightAngleRad) * lightRadius };
        
        lightElements.push(
            <circle 
                key={`light-${i}`} 
                cx={lightPos.x} 
                cy={lightPos.y} 
                r="14" 
                className="wave-light-ball"
                style={{ animationDelay: `${delays[i]}s` }}
            />
        );
    }
    return lightElements;
  }, []);

  // Memoize the pegs based on participant count
  const pegs = useMemo(() => {
    const pegElements = [];
    for (let i = 0; i < numParticipants; i++) {
        const pegAngle = segmentAngle * i;
        const pegAngleRad = (pegAngle - 90) * Math.PI / 180;
        const pegRadius = 430;
        const pegPos = { x: center + Math.cos(pegAngleRad) * pegRadius, y: center + Math.sin(pegAngleRad) * pegRadius };
        pegElements.push(<circle key={`peg-${i}`} cx={pegPos.x} cy={pegPos.y} r="10" fill="url(#metallic-peg-gradient)" />);
    }
    return pegElements;
  }, [numParticipants, segmentAngle]);

  return (
    <svg viewBox="0 0 1000 1000" className="w-full h-full">
      <g>
        <circle cx="500" cy="500" r="500" fill="#35200d" />
        <circle cx="500" cy="500" r="496" fill="#40260f" />
        {lights}
      </g>
      
      <g 
        style={{ 
            transform: `rotate(${rotation}deg)`, 
            transformOrigin: '500px 500px',
        }}
      >
        <g clipPath="url(#circle-clip)">
          {segments}
        </g>
        <circle cx="500" cy="500" r="420" fill="none" stroke="#0b0f1c" strokeWidth="2" />
        {pegs}
      </g>
      
      {/* Clickable area for the segments */}
      <circle
        cx="500"
        cy="500"
        r="420"
        fill="transparent"
        onClick={clickable ? onClick : undefined}
        className={clickable ? 'cursor-pointer' : ''}
      />
      
      <g>
          <circle cx="500" cy="500" r="40" fill="#40260f" />
          <circle cx="500" cy="500" r="35" fill="#3e2711" />
          <circle cx="500" cy="500" r="10" fill="url(#metallic-center-gradient)" />
      </g>

      <defs>
        <radialGradient id="metallic-peg-gradient" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" style={{stopColor: '#f1f5f9'}} />
            <stop offset="100%" style={{stopColor: '#94a3b8'}} />
        </radialGradient>
        <radialGradient id="metallic-center-gradient" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" style={{stopColor: '#f8fafc'}} />
            <stop offset="50%" style={{stopColor: '#94a3b8'}} />
            <stop offset="100%" style={{stopColor: '#475569'}} />
        </radialGradient>
        <radialGradient id="glass-bulb-gradient" cx="0.35" cy="0.35" r="0.65">
          <stop offset="0%" style={{ stopColor: 'rgba(255, 255, 255, 0.6)' }} />
          <stop offset="30%" style={{ stopColor: 'rgba(200, 200, 220, 0.2)' }} />
          <stop offset="100%" style={{ stopColor: 'rgba(150, 150, 180, 0.1)' }} />
        </radialGradient>
        <clipPath id="circle-clip">
          <circle cx="500" cy="500" r="420" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default Wheel;