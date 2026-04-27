import { useRef, useCallback } from 'react';

// Simple notification sound using Web Audio API
const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create a pleasant notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Pleasant chime sound
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
      oscillator.type = 'sine';
      
      // Fade in/out for smooth sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
};

export default useNotificationSound;
