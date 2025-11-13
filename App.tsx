
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ParticipantInput from './components/ParticipantInput';
import ParticipantList from './components/ParticipantList';
import RaffleDisplay from './components/RaffleDisplay';
import Confetti from './components/Confetti';
import { EnterFullScreenIcon, ExitFullScreenIcon, MusicOffIcon, MusicOnIcon } from './components/icons';

const logoUrl = 'https://i.postimg.cc/3RJKCdXW/smlogo1.png';

const getCoreName = (name: string): string => {
  if (!name) return "";
  // Extract only alphabetic characters to form the core name for comparison.
  // This groups names like "Lucas", "$10 Lucas", and "Lucas2" together.
  const alphabeticOnly = name.replace(/[^a-zA-Z]/g, '');
  return alphabeticOnly || name.trim(); // Fallback to the original name if no letters are found
};


const App: React.FC = () => {
  const [participants, setParticipants] = useState<string[]>(() => {
    try {
      const savedParticipants = localStorage.getItem('participantsList');
      return savedParticipants ? JSON.parse(savedParticipants) : [];
    } catch (error) {
      console.error("Error parsing participants from localStorage", error);
      return [];
    }
  });
  const [wheelParticipants, setWheelParticipants] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isReturning, setIsReturning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [preSpinRotation, setPreSpinRotation] = useState<number>(0);
  const [tickCount, setTickCount] = useState<number>(0);
  const [winnerHistory, setWinnerHistory] = useState<{ winnerName: string; raffleTitle: string; timestamp: number }[]>(() => {
    try {
      const savedHistory = localStorage.getItem('winnerHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Error parsing winner history from localStorage", error);
      return [];
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(!!document.fullscreenElement);
  
  const audioRef = useRef<{
    context: AudioContext | null;
    tickSound: (() => void) | null;
    winSound: (() => void) | null;
    stopSound: (() => void) | null;
    shuffleSound: (() => void) | null;
    eraserSound: (() => void) | null;
    backgroundMusic: {
      sources: (OscillatorNode | AudioBufferSourceNode)[];
      timeouts: number[];
    } | null;
  }>({
    context: null,
    tickSound: null,
    winSound: null,
    stopSound: null,
    shuffleSound: null,
    eraserSound: null,
    backgroundMusic: null,
  });
  const masterGainRef = useRef<GainNode | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Keep the wheel participants in sync with the master list
    setWheelParticipants(participants);
  }, [participants]);


  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
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

  // Save participants to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('participantsList', JSON.stringify(participants));
    } catch (error) {
      console.error("Error saving participants to localStorage", error);
    }
  }, [participants]);

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
    // --- Audio Logic ---
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

    if (context && !audioRef.current.shuffleSound) {
        audioRef.current.shuffleSound = () => {
            if (!context) return;
            const now = context.currentTime;
            const duration = 0.15;

            // Create a square wave oscillator for a classic 8-bit sound
            const osc = context.createOscillator();
            osc.type = 'square';

            // A quick upward pitch slide, characteristic of a "select" sound
            const startFrequency = 261.63; // C4
            const endFrequency = 349.23;   // F4
            osc.frequency.setValueAtTime(startFrequency, now);
            osc.frequency.linearRampToValueAtTime(endFrequency, now + duration * 0.5);

            // Create a sharp volume envelope for a short "bleep"
            const gainNode = context.createGain();
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Fast decay

            // Connect the audio graph and play the sound
            osc.connect(gainNode);
            gainNode.connect(context.destination);
            osc.start(now);
            osc.stop(now + duration);
        };
    }

    if (audioRef.current.shuffleSound) {
        audioRef.current.shuffleSound();
    }
    // --- End Audio Logic ---

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
    if (wheelParticipants.length < 2 || isSpinning || isReturning) return;

    setPreSpinRotation(rotation);

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
          const masterGain = context.createGain();
          masterGain.gain.setValueAtTime(0.15, now); // Adjusted volume for a crisp click
          masterGain.connect(context.destination);

          // --- Part 1: The "Plastic" component - A sharp, filtered noise burst ---
          const noise = context.createBufferSource();
          const bufferSize = context.sampleRate * 0.03; // A very short duration
          const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;

          const noiseFilter = context.createBiquadFilter();
          // A bandpass filter to simulate the resonant frequency of plastic
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.value = 3000; // Mid-high frequency
          noiseFilter.Q.value = 15; // A fairly sharp resonance

          const noiseGain = context.createGain();
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGain);

          // A very fast attack and decay for a sharp "tick"
          noiseGain.gain.setValueAtTime(1.0, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
          noise.start(now);
          noise.stop(now + 0.03);

          // --- Part 2: The "Metallic" component - A short, inharmonic ring ---
          // Use square waves for a brighter, slightly harsher metallic tone
          // Inharmonic frequencies give a more realistic "clank"
          const frequencies = [4500, 5800];
          const oscGain = context.createGain();
          oscGain.connect(masterGain);
          
          frequencies.forEach(freq => {
              const osc = context.createOscillator();
              osc.type = 'square'; // Brighter than sine
              osc.frequency.setValueAtTime(freq, now);
              // Slight detuning adds to the metallic character
              osc.detune.setValueAtTime(Math.random() * 10 - 5, now);
              osc.connect(oscGain);
              osc.start(now);
              osc.stop(now + 0.05); // Very short duration
          });
          
          // A very sharp envelope for the metallic part
          oscGain.gain.setValueAtTime(0.2, now); // Lower volume than the plastic "thwack"
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      };
    }

    if (context && !audioRef.current.winSound) {
      audioRef.current.winSound = () => {
          if (!context) return;
          const now = context.currentTime;
          const masterGain = context.createGain();
          masterGain.gain.setValueAtTime(0.4, now); // A bit louder for more impact
          masterGain.connect(context.destination);
  
          // Reverb for a grander, more spacious feel
          const reverb = context.createConvolver();
          const reverbTime = 2.5, decay = 2.0;
          const len = context.sampleRate * reverbTime;
          const impulse = context.createBuffer(2, len, context.sampleRate);
          for (let channel = 0; channel < 2; channel++) {
              const impulseChannel = impulse.getChannelData(channel);
              for (let i = 0; i < len; i++) {
                  impulseChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
              }
          }
          reverb.buffer = impulse;
          masterGain.connect(reverb);
          reverb.connect(context.destination);
          
          // --- NEW Celebratory Sound Elements ---
  
          // 1. Kick Drum for a powerful start to the final chord
          const kickTime = now + 0.4;
          const kickOsc = context.createOscillator();
          kickOsc.frequency.setValueAtTime(150, kickTime);
          kickOsc.frequency.exponentialRampToValueAtTime(0.001, kickTime + 0.5);
  
          const kickGain = context.createGain();
          kickGain.gain.setValueAtTime(1, kickTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.5);
          
          kickOsc.connect(kickGain);
          kickGain.connect(masterGain);
          kickOsc.start(kickTime);
          kickOsc.stop(kickTime + 0.5);
  
          // 2. Fast, ascending arpeggio to build excitement
          const arpeggioNotes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          arpeggioNotes.forEach((freq, i) => {
              const noteTime = now + i * 0.1;
              const osc = context.createOscillator();
              osc.type = 'triangle'; // A pure, bright tone
              osc.frequency.setValueAtTime(freq, noteTime);
  
              const gain = context.createGain();
              gain.gain.setValueAtTime(0, noteTime);
              gain.gain.linearRampToValueAtTime(0.5, noteTime + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);
              
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.2);
          });
  
          // 3. The Big Final Chord - richer and fuller
          const finalChordTime = now + 0.4;
          const finalChordNotes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C Major with an added E5
          finalChordNotes.forEach((freq, i) => {
              const osc = context.createOscillator();
              osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
              osc.frequency.setValueAtTime(freq, finalChordTime);
              osc.detune.setValueAtTime(i * 5 - 10, finalChordTime);
              
              const gain = context.createGain();
              gain.gain.setValueAtTime(0, finalChordTime);
              gain.gain.linearRampToValueAtTime(0.3, finalChordTime + 0.05);
              gain.gain.exponentialRampToValueAtTime(0.001, finalChordTime + 3.0);
  
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(finalChordTime);
              osc.stop(finalChordTime + 3.1);
          });
  
          // 4. Shimmery Cymbal Crash
          const noise = context.createBufferSource();
          const bufferSize = context.sampleRate * 2.5;
          const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          noise.buffer = buffer;
  
          const noiseGain = context.createGain();
          noiseGain.gain.setValueAtTime(0.6, finalChordTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, finalChordTime + 2.2);
  
          // Use multiple filters for a more realistic, metallic shimmer
          const bandpass1 = context.createBiquadFilter();
          bandpass1.type = 'bandpass';
          bandpass1.frequency.value = 8000;
          bandpass1.Q.value = 0.5;
  
          const bandpass2 = context.createBiquadFilter();
          bandpass2.type = 'bandpass';
          bandpass2.frequency.value = 12000;
          bandpass2.Q.value = 0.5;
          
          const highpass = context.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 5000;
  
          noise.connect(highpass);
          highpass.connect(bandpass1);
          highpass.connect(bandpass2);
          bandpass1.connect(noiseGain);
          bandpass2.connect(noiseGain);
          noiseGain.connect(masterGain);
  
          noise.start(finalChordTime);
          noise.stop(finalChordTime + 2.5);
      };
    }

    if (context && !audioRef.current.stopSound) {
      audioRef.current.stopSound = () => {
          if (!context) return;
          const now = context.currentTime;
          const masterGain = context.createGain();
          masterGain.gain.setValueAtTime(0.4, now);
          masterGain.connect(context.destination);
  
          // --- The "Clunk" part - A low-frequency noise burst ---
          const noise = context.createBufferSource();
          const bufferSize = context.sampleRate * 0.1;
          const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;
  
          const noiseFilter = context.createBiquadFilter();
          noiseFilter.type = 'lowpass';
          noiseFilter.frequency.setValueAtTime(500, now);
          noiseFilter.Q.value = 1;
  
          const noiseGain = context.createGain();
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGain);
  
          noiseGain.gain.setValueAtTime(1.0, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
          noise.start(now);
          noise.stop(now + 0.1);
  
          // --- The short "Metallic" part ---
          const frequencies = [600, 950];
          const oscGain = context.createGain();
          oscGain.connect(masterGain);
          
          frequencies.forEach(freq => {
              const osc = context.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, now);
              osc.detune.setValueAtTime(Math.random() * 10 - 5, now);
              osc.connect(oscGain);
              osc.start(now);
              osc.stop(now + 0.15);
          });
          
          oscGain.gain.setValueAtTime(0.3, now);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
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
    
    const duration = 12000;
    let startTime: number | null = null;
    const startRotation = rotation % 360;
    
    const easeOutExpo = (x: number): number => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    
    let lastTickAngle = startRotation;

    const spin = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        if (elapsedTime >= duration) {
            const finalWinner = wheelParticipants[winnerIndex];
            setRotation(targetRotation);
            setWinner(finalWinner);
            setIsSpinning(false);

            // The sound originally played 200ms after the wheel stopped.
            // Playing it 200ms earlier means it plays immediately (0ms delay).
            setTimeout(() => {
                if (audioRef.current.winSound) {
                    audioRef.current.winSound();
                }
            }, 0);

            const newWinnerEntry = {
              winnerName: finalWinner,
              raffleTitle: 'Prize Wheel Raffle',
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

  }, [wheelParticipants, isSpinning, rotation, isReturning]);

  const animateWheelToStart = useCallback((onComplete?: () => void) => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  
    setIsReturning(true);

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
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        animationFrameId.current = null;
        setIsReturning(false);
        if (onComplete) {
          onComplete();
        }
        return;
      }
  
      const progress = elapsedTime / returnDuration;
      const easedProgress = easeOutCubic(progress);
      const newRotation = startReturnRotation + (targetReturnRotation - startReturnRotation) * easedProgress;
      
      setRotation(newRotation);
      animationFrameId.current = requestAnimationFrame(animateReturn);
    };
  
    animationFrameId.current = requestAnimationFrame(animateReturn);
  }, [rotation, preSpinRotation]);

  const handleStopSpin = useCallback(() => {
    if (!isSpinning || isReturning) return;

    if (audioRef.current.stopSound) {
      audioRef.current.stopSound();
    }
  
    animateWheelToStart(() => {
      setIsSpinning(false); // Officially end the spin state
    });
  }, [isSpinning, isReturning, animateWheelToStart]);

  const resetRaffle = useCallback(() => {
    if (isReturning) return;
    setWinner(null);
    animateWheelToStart();
  }, [animateWheelToStart, isReturning]);

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

  const clearAll = useCallback(() => {
    // --- Audio Logic ---
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

    if (context && !audioRef.current.eraserSound) {
        audioRef.current.eraserSound = () => {
            if (!context) return;
            const now = context.currentTime;
            const masterGain = context.createGain();
            masterGain.gain.setValueAtTime(0.4, now); // Master volume for the effect
            masterGain.connect(context.destination);

            // --- Part 1: "Thump" of trash hitting the bottom ---
            const thumpOsc = context.createOscillator();
            thumpOsc.type = 'sine';
            thumpOsc.frequency.setValueAtTime(150, now);
            thumpOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

            const thumpGain = context.createGain();
            thumpGain.gain.setValueAtTime(0.7, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            thumpOsc.connect(thumpGain).connect(masterGain);
            thumpOsc.start(now);
            thumpOsc.stop(now + 0.2);

            // --- Part 2: "Crinkle/Rustle" of paper/plastic ---
            const bufferSize = context.sampleRate * 0.25;
            const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noiseSource = context.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const noiseFilter = context.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(5000, now);
            noiseFilter.Q.setValueAtTime(20, now);

            const noiseGain = context.createGain();
            // A few quick bursts to sound like rustling
            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.6, now + 0.02);
            noiseGain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
            noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            noiseSource.connect(noiseFilter).connect(noiseGain).connect(masterGain);
            noiseSource.start(now);
            noiseSource.stop(now + 0.25);
        };
    }

    if (audioRef.current.eraserSound) {
        audioRef.current.eraserSound();
    }
    // --- End Audio Logic ---
    setParticipants([]);
    setWinner(null);
  }, []);

  const mainTitle = "Score Milk Prize Wheel";

  return (
    <div className="w-screen h-screen bg-black flex flex-col overflow-hidden">
      <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMute}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
          aria-label={isMuted ? 'Unmute background sound' : 'Mute background sound'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MusicOffIcon /> : <MusicOnIcon />}
        </button>
        <button
          type="button"
          onClick={toggleFullScreen}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:scale-110"
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
          <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
        </button>
      </div>

      <div className="bg-gray-900 text-gray-100 font-sans flex flex-col w-full h-full">
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-grow h-full overflow-hidden">
          <header className="flex-shrink-0 flex justify-center items-center mb-4 gap-6">
            <img src={logoUrl} alt="Scoremilk Logo" className="w-20 h-20" />
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {mainTitle.split('').map((char, index) => (
                  <span
                    key={index}
                    className="wave-letter"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Want your name here? Join Score Milk Tournaments and Engage on Social Media!</p>
            </div>
          </header>
          
          {winner && <Confetti />}

          <main className="flex-1 min-h-0 flex flex-col xl:flex-row gap-4 max-w-full w-full mx-auto">
            <div className="h-2/5 xl:h-auto xl:w-1/3 xl:max-w-md bg-gray-950/50 rounded-xl p-6 shadow-lg flex flex-col min-h-0">
              <ParticipantInput 
                onAddParticipant={addParticipant} 
                onAddMultipleParticipants={addMultipleParticipants}
                disabled={isSpinning} 
                winnerHistory={winnerHistory}
                onShuffle={shuffleWheel}
              />
              <div className="mt-4 border-t border-gray-700 pt-4 flex-grow min-h-0">
                <ParticipantList
                  participants={participants}
                  onRemoveParticipant={removeParticipant}
                  onClearAll={clearAll}
                  isSpinning={isSpinning}
                />
              </div>
            </div>

            <div className="flex-1 bg-gray-950/50 rounded-xl shadow-lg flex items-center justify-center p-2 sm:p-4 md:p-6 min-h-0">
              <RaffleDisplay
                participants={wheelParticipants}
                originalParticipants={participants}
                winner={winner}
                isSpinning={isSpinning}
                isReturning={isReturning}
                onSpin={handleSpin}
                onStopSpin={handleStopSpin}
                onReset={resetRaffle}
                onRemoveWinnerEntries={removeWinnerEntries}
                rotation={rotation}
                tickCount={tickCount}
                isFullscreen={isFullscreen}
              />
            </div>
          </main>

          <footer className="flex-shrink-0 text-center text-gray-500 mt-4 py-2">
            <p>Built exclusively for scoremilk.com</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
