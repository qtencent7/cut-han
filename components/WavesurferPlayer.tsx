'use client';

import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WavesurferPlayerProps {
  url: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorWidth?: number;
  interact?: boolean;
}

export default function WavesurferPlayer({
  url,
  height = 80,
  waveColor = '#ddd',
  progressColor = '#999',
  cursorWidth = 1,
  interact = false,
}: WavesurferPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      cursorWidth,
      interact,
      url: url,
      backend: 'WebAudio', // Use WebAudio for better rendering
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [url, height, waveColor, progressColor, cursorWidth, interact]);

  return <div ref={containerRef} className="w-full" />;
}
