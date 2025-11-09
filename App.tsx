
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ParticipantInput from './components/ParticipantInput';
import ParticipantList from './components/ParticipantList';
import RaffleDisplay from './components/RaffleDisplay';
import Confetti from './components/Confetti';

const getCoreName = (name: string): string => {
  if (!name) return "";
  // Extract only alphabetic characters to form the core name for comparison.
  // This groups names like "Lucas", "$10 Lucas", and "Lucas2" together.
  const alphabeticOnly = name.replace(/[^a-zA-Z]/g, '');
  return alphabeticOnly || name.trim(); // Fallback to the original name if no letters are found
};


const App: React.FC = () => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [wheelParticipants, setWheelParticipants] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [preSpinRotation, setPreSpinRotation] = useState<number>(0);
  const [tickCount, setTickCount] = useState<number>(0);
  const [raffleTitle, setRaffleTitle] = useState<string>('');
  const [winnerHistory, setWinnerHistory] = useState<{ winnerName: string; raffleTitle: string; timestamp: number }[]>(() => {
    try {
      const savedHistory = localStorage.getItem('winnerHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Error parsing winner history from localStorage", error);
      return [];
    }
  });
  const [raffleError, setRaffleError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const audioRef = useRef<{
    context: AudioContext | null;
    tickSound: (() => void) | null;
    winSound: (() => void) | null;
    backgroundMusic: {
      sources: (OscillatorNode | AudioBufferSourceNode)[];
      timeouts: number[];
    } | null;
  }>({
    context: null,
    tickSound: null,
    winSound: null,
    backgroundMusic: null,
  });
  const masterGainRef = useRef<GainNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Keep the wheel participants in sync with the master list
    setWheelParticipants(participants);
  }, [participants]);


  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (audioRef.current.context && audioRef.current.context.state !== 'closed') {
        if (audioRef.current.backgroundMusic?.sources) {
            audioRef.current.backgroundMusic.sources.forEach(source => {
              try { source.stop() } catch (e) { /* ignore */ }
            });
        }
        if (audioRef.current.backgroundMusic?.timeouts) {
            audioRef.current.backgroundMusic.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        }
        audioRef.current.context.close();
      }
    };
  }, []);

  // Save winner history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('winnerHistory', JSON.stringify(winnerHistory));
    } catch (error) {
      console.error("Error saving winner history to localStorage", error);
    }
  }, [winnerHistory]);
  
  // Effect to handle volume changes when isMuted state changes
  useEffect(() => {
    if (masterGainRef.current && audioRef.current.context) {
      const targetVolume = isMuted ? 0 : 0.03;
      masterGainRef.current.gain.linearRampToValueAtTime(targetVolume, audioRef.current.context.currentTime + 0.2);
    }
  }, [isMuted]);

  // Effect to listen for fullscreen changes (e.g., user pressing ESC)
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Inactivity timer logic
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
        setRaffleTitle('');
    }, 5 * 60 * 1000); // 5 minutes
  }, []);

  useEffect(() => {
    if (isSpinning) {
      // If spinning starts, clear the timer
      if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
      }
    } else {
      // When not spinning (either on load or after a spin), reset the timer
      resetInactivityTimer();
    }
  }, [isSpinning, resetInactivityTimer]);

  const initializeBackgroundMusic = useCallback(() => {
    if (audioRef.current.backgroundMusic) return; // Already initialized

    if (!audioRef.current.context) {
      try {
        const AudioCtxt = window.AudioContext || (window as any).webkitAudioContext;
        audioRef.current.context = new AudioCtxt();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser.");
        return;
      }
    }

    const context = audioRef.current.context;
    if (!context) return;
    
    if (context.state === 'suspended') {
      context.resume();
    }

    const allSources: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const timeouts: number[] = [];

    // Master gain for the background music, keep it subtle
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.03, context.currentTime);
    masterGain.connect(context.destination);
    masterGainRef.current = masterGain; // Store reference to master gain

    // --- 1. Warm Ambient Pad ---
    const padGain = context.createGain();
    padGain.gain.setValueAtTime(0.6, context.currentTime);
    
    const padFilter = context.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(400, context.currentTime);
    padFilter.Q.setValueAtTime(5, context.currentTime);
    padGain.connect(padFilter).connect(masterGain);
    
    // Two detuned oscillators for a rich pad sound
    const padOsc1 = context.createOscillator();
    padOsc1.type = 'sawtooth';
    padOsc1.frequency.setValueAtTime(65.41, context.currentTime); // C2
    padOsc1.detune.setValueAtTime(-5, context.currentTime); // slight detune
    padOsc1.connect(padGain);
    allSources.push(padOsc1);

    const padOsc2 = context.createOscillator();
    padOsc2.type = 'sawtooth';
    padOsc2.frequency.setValueAtTime(65.41, context.currentTime); // C2
    padOsc2.detune.setValueAtTime(5, context.currentTime); // slight detune
    padOsc2.connect(padGain);
    allSources.push(padOsc2);
    
    // LFO to gently modulate the filter cutoff for a "breathing" effect
    const filterLFO = context.createOscillator();
    filterLFO.type = 'sine';
    filterLFO.frequency.setValueAtTime(0.1, context.currentTime); // very slow
    const filterLFOGain = context.createGain();
    filterLFOGain.gain.setValueAtTime(150, context.currentTime); // modulation depth in Hz
    filterLFO.connect(filterLFOGain).connect(padFilter.frequency);
    allSources.push(filterLFO);

    // --- 2. Gentle Melodic Notes ---
    const melodyGain = context.createGain();
    melodyGain.gain.setValueAtTime(0.8, context.currentTime);

    // Simple delay/echo effect for the melody
    const delay = context.createDelay(5.0);
    delay.delayTime.setValueAtTime(0.4, context.currentTime);
    const feedback = context.createGain();
    feedback.gain.setValueAtTime(0.5, context.currentTime);
    
    melodyGain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(masterGain);
    melodyGain.connect(masterGain); // connect dry signal too

    const playMelodyNote = () => {
        if (context.state === 'closed') return;
        const C_MAJOR_PENTATONIC_SCALE_FREQUENCIES = [ 261.63, 293.66, 329.63, 392.00, 440.00, 523.25 ];
        const noteOsc = context.createOscillator();
        noteOsc.type = 'sine';
        const randomNoteIndex = Math.floor(Math.random() * C_MAJOR_PENTATONIC_SCALE_FREQUENCIES.length);
        noteOsc.frequency.setValueAtTime(C_MAJOR_PENTATONIC_SCALE_FREQUENCIES[randomNoteIndex], context.currentTime);
        const noteEnvelope = context.createGain();
        noteEnvelope.gain.setValueAtTime(0, context.currentTime);
        noteEnvelope.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1); // Attack
        noteEnvelope.gain.linearRampToValueAtTime(0, context.currentTime + 1.5); // Decay/Release
        noteOsc.connect(noteEnvelope).connect(melodyGain);
        noteOsc.start();
        noteOsc.stop(context.currentTime + 1.5);
        const nextNoteDelay = Math.random() * 4000 + 3000; // Play a note every 3-7 seconds
        timeouts.push(window.setTimeout(playMelodyNote, nextNoteDelay));
    };
    timeouts.push(window.setTimeout(playMelodyNote, 2000));

    // --- 3. Soft Pink Noise ---
    const bufferSize = 2 * context.sampleRate;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    // Generate pink noise (simplified approximation using Paul Kellett's refined method)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
    }

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    allSources.push(noiseSource);

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.2, context.currentTime);
    noiseSource.connect(noiseGain).connect(masterGain);
    
    // Start everything
    allSources.forEach(source => {
        if ('start' in source) {
            source.start();
        }
    });
    
    audioRef.current.backgroundMusic = { sources: allSources, timeouts };
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    initializeBackgroundMusic();
    setIsMuted(prev => !prev);
  }, [initializeBackgroundMusic]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const addParticipant = useCallback((name: string) => {
    const newName = name.trim();
    // Prevent adding empty names or exact duplicates (case-insensitive)
    if (!newName || participants.some(p => p.toLowerCase() === newName.toLowerCase())) {
      return;
    }

    const newCoreName = getCoreName(newName);
    
    let lastSimilarIndex = -1;
    // Find the last participant with the same core name
    if (newCoreName) {
        participants.forEach((participant, index) => {
            if (getCoreName(participant).toLowerCase() === newCoreName.toLowerCase()) {
                lastSimilarIndex = index;
            }
        });
    }

    setParticipants(prev => {
        const newList = [...prev];
        if (lastSimilarIndex !== -1) {
            // Insert the new participant after the last similar one
            newList.splice(lastSimilarIndex + 1, 0, newName);
        } else {
            // Otherwise, add it to the end of the list
            newList.push(newName);
        }
        return newList;
    });
  }, [participants]);
  
  const addMultipleParticipants = useCallback((names: string[]) => {
    const newParticipants = [...participants];
    const existingNamesLower = new Set(newParticipants.map(p => p.toLowerCase()));
  
    for (const name of names) {
      const newName = name.trim();
      if (!newName || existingNamesLower.has(newName.toLowerCase())) {
        continue; // Skip empty names and duplicates
      }
  
      // This name is new, add it to the set for future checks in this same batch
      existingNamesLower.add(newName.toLowerCase());
  
      const newCoreName = getCoreName(newName);
      let lastSimilarIndex = -1;
      if (newCoreName) {
        // Find the last index in the *currently building* list
        for (let i = newParticipants.length - 1; i >= 0; i--) {
          if (getCoreName(newParticipants[i]).toLowerCase() === newCoreName.toLowerCase()) {
            lastSimilarIndex = i;
            break;
          }
        }
      }
  
      if (lastSimilarIndex !== -1) {
        newParticipants.splice(lastSimilarIndex + 1, 0, newName);
      } else {
        newParticipants.push(newName);
      }
    }
  
    setParticipants(newParticipants);
  }, [participants]);

  const removeParticipant = useCallback((indexToRemove: number) => {
    setParticipants(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);
  
  const shuffleWheel = useCallback(() => {
    setWheelParticipants(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleSpin = useCallback(() => {
    if (!raffleTitle.trim()) {
      setRaffleError("Raffle name is required");
      return;
    }

    if (wheelParticipants.length < 2 || isSpinning) return;

    setPreSpinRotation(rotation);
    setRaffleError(null);

    if (!audioRef.current.context) {
      try {
        const AudioCtxt = window.AudioContext || (window as any).webkitAudioContext;
        audioRef.current.context = new AudioCtxt();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser.");
      }
    }
    const context = audioRef.current.context;
    if (context && context.state === 'suspended') {
      context.resume();
    }
    
    if (context && !audioRef.current.tickSound) {
      audioRef.current.tickSound = () => {
        if (!context) return;
        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      };
    }

    if (context && !audioRef.current.winSound) {
       audioRef.current.winSound = () => {
        if (!context) return;
        const now = context.currentTime;
        const masterGain = context.createGain();
        masterGain.gain.setValueAtTime(0.4, now);
        masterGain.connect(context.destination);

        // Simple Reverb for a grander feel
        const reverb = context.createConvolver();
        const reverbTime = 1.5;
        const decay = 2.0;
        const sampleRate = context.sampleRate;
        const len = sampleRate * reverbTime;
        const impulse = context.createBuffer(2, len, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        for (let i = 0; i < len; i++) {
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        reverb.buffer = impulse;
        masterGain.connect(reverb);
        reverb.connect(context.destination);
        
        // --- Brass Fanfare ---
        const fanfareGain = context.createGain();
        fanfareGain.connect(masterGain);
        
        // Use 3 oscillators for a rich, chorus-like brass sound
        const oscs = [context.createOscillator(), context.createOscillator(), context.createOscillator()];
        oscs.forEach((osc, i) => {
            osc.type = 'sawtooth';
            const detune = i === 1 ? 7 : i === 2 ? -7 : 0; // Detune for richness
            osc.detune.setValueAtTime(detune, now);
            osc.connect(fanfareGain);
            osc.start(now);
        });

        // Triumphant Arpeggio
        const notes = [
            { freq: 196.00, duration: 0.15 }, // G3
            { freq: 261.63, duration: 0.15 }, // C4
            { freq: 329.63, duration: 0.15 }, // E4
            { freq: 392.00, duration: 0.15 }, // G4
            { freq: 523.25, duration: 0.60 }  // C5 (held longer)
        ];
        let noteStartTime = now;
        const gap = 0.05;

        notes.forEach((note) => {
            if (note.freq > 0) {
                oscs.forEach(osc => osc.frequency.setValueAtTime(note.freq, noteStartTime));
                
                // ADSR envelope for a brass "stab"
                fanfareGain.gain.setValueAtTime(0, noteStartTime);
                fanfareGain.gain.linearRampToValueAtTime(0.6, noteStartTime + 0.02); // Fast attack
                fanfareGain.gain.exponentialRampToValueAtTime(0.2, noteStartTime + note.duration); // Decay
            }
            noteStartTime += note.duration + gap;
        });


        // --- Cymbal Crash ---
        const lastNote = notes[notes.length - 1];
        const cymbalTime = noteStartTime - (lastNote.duration + gap); // At the start of the last note
        const noise = context.createBufferSource();
        const bufferSize = context.sampleRate * 1.5;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }
        noise.buffer = buffer;

        const noiseFilter = context.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 4000;

        const noiseGain = context.createGain();
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(cymbalTime);
        noiseGain.gain.setValueAtTime(0.5, cymbalTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, cymbalTime + 1.2);

        // Cleanup
        const stopTime = now + 4;
        oscs.forEach(osc => osc.stop(stopTime));
        noise.stop(stopTime);
      };
    }
    
    setIsSpinning(true);
    setWinner(null);

    const winnerIndex = Math.floor(Math.random() * wheelParticipants.length);
    const numParticipants = wheelParticipants.length;
    const segmentAngle = 360 / numParticipants;

    const winnerAngle = segmentAngle * winnerIndex + segmentAngle / 2;
    const targetStopAngle = (360 - winnerAngle + 360) % 360;

    const fullRotations = 12 * 360;
    const randomOffset = Math.random() * segmentAngle * 0.8 - (segmentAngle * 0.4);
    const targetRotation = fullRotations + targetStopAngle + randomOffset;
    
    const duration = 19000;
    let startTime: number | null = null;
    const startRotation = rotation % 360;
    
    const easeOutExpo = (x: number): number => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    
    let lastTickAngle = startRotation;
    const soundTriggerTime = duration - 800;
    let soundTriggered = false;

    const spin = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        if (elapsedTime >= soundTriggerTime && !soundTriggered) {
          if (audioRef.current.winSound) audioRef.current.winSound();
          soundTriggered = true;
        }

        if (elapsedTime >= duration) {
            const finalWinner = wheelParticipants[winnerIndex];
            setRotation(targetRotation);
            setWinner(finalWinner);
            setIsSpinning(false);

            const newWinnerEntry = {
              winnerName: finalWinner,
              raffleTitle: raffleTitle.trim() || 'General Raffle',
              timestamp: Date.now(),
            };
            setWinnerHistory(prev => [...prev, newWinnerEntry]);

            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
            return;
        }

        const progress = elapsedTime / duration;
        const easedProgress = easeOutExpo(progress);
        const currentRotation = startRotation + (targetRotation - startRotation) * easedProgress;
        
        const currentAngle = Math.floor(currentRotation / segmentAngle);
        const lastAngle = Math.floor(lastTickAngle / segmentAngle);

        if (currentAngle > lastAngle) {
            if(audioRef.current.tickSound) audioRef.current.tickSound();
            setTickCount(c => c + 1);
        }
        
        lastTickAngle = currentRotation;
        setRotation(currentRotation);
        animationFrameId.current = requestAnimationFrame(spin);
    };

    animationFrameId.current = requestAnimationFrame(spin);

  }, [wheelParticipants, isSpinning, rotation, raffleTitle]);

  const handleStopSpin = useCallback(() => {
    if (!isSpinning) return;
  
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  
    // Animate the wheel back to its starting position
    const startReturnRotation = rotation;
    const targetReturnRotation = preSpinRotation;
    const returnDuration = 1000; // 1 second to "rewind"
    let startTime: number | null = null;
  
    // Easing function for a smooth slow-down effect
    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
  
    const animateReturn = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
  
      if (elapsedTime >= returnDuration) {
        setRotation(targetReturnRotation);
        setIsSpinning(false); // Officially end the spin state
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        animationFrameId.current = null;
        return;
      }
  
      const progress = elapsedTime / returnDuration;
      const easedProgress = easeOutCubic(progress);
      const newRotation = startReturnRotation + (targetReturnRotation - startReturnRotation) * easedProgress;
      
      setRotation(newRotation);
      animationFrameId.current = requestAnimationFrame(animateReturn);
    };
  
    animationFrameId.current = requestAnimationFrame(animateReturn);
  }, [isSpinning, rotation, preSpinRotation]);

  const resetRaffle = useCallback(() => {
    setWinner(null);
  }, []);

  const removeWinnerEntries = useCallback((winnerName: string | null) => {
    if (!winnerName) return;

    const coreName = getCoreName(winnerName);

    if (coreName) {
        setParticipants(prev => 
            prev.filter(p => getCoreName(p).toLowerCase() !== coreName.toLowerCase())
        );
    }
    
    resetRaffle();
  }, [resetRaffle]);

  const handleRaffleTitleChange = (newTitle: string) => {
    setRaffleTitle(newTitle);
    if (raffleError) {
      setRaffleError(null);
    }
    resetInactivityTimer();
  };

  const clearAll = useCallback(() => {
    setParticipants([]);
    setWinner(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 flex flex-col">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold breathing-text">
          SCOREMILK PRIZE WHEEL
        </h1>
        <p className="text-slate-400 mt-2 text-xl">Want to be here? Participate in Scoremilk Tournaments and Engage on Social Media!</p>
      </header>
      
      {winner && <Confetti />}

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 lg:items-start gap-8 max-w-7xl w-full mx-auto">
        <div className="lg:col-span-1 bg-slate-800/50 rounded-xl p-6 shadow-lg flex flex-col h-full">
          <ParticipantInput 
            onAddParticipant={addParticipant} 
            onAddMultipleParticipants={addMultipleParticipants}
            disabled={isSpinning} 
            winnerHistory={winnerHistory}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            isFullscreen={isFullscreen}
            onToggleFullScreen={toggleFullScreen}
          />
          <div className="mt-4 border-t border-slate-700 pt-4 flex-grow">
            <ParticipantList
              participants={participants}
              onRemoveParticipant={removeParticipant}
              onClearAll={clearAll}
              isSpinning={isSpinning}
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-800/50 rounded-xl shadow-lg flex items-center justify-center p-6 min-h-[400px] lg:h-auto">
          <RaffleDisplay
            participants={wheelParticipants}
            winner={winner}
            isSpinning={isSpinning}
            onSpin={handleSpin}
            onStopSpin={handleStopSpin}
            onReset={resetRaffle}
            onRemoveWinnerEntries={removeWinnerEntries}
            onShuffle={shuffleWheel}
            rotation={rotation}
            tickCount={tickCount}
            raffleTitle={raffleTitle}
            onRaffleTitleChange={handleRaffleTitleChange}
            raffleError={raffleError}
            onClearRaffleError={() => setRaffleError(null)}
          />
        </div>
      </main>

      <footer className="text-center text-slate-500 mt-8 py-4">
        <p>Built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
