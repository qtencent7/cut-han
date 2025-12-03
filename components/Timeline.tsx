'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Scissors, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Slider, message } from 'antd';
import WavesurferPlayer from './WavesurferPlayer';

interface TimelineProps {
  videoSrc: string | null;
  audioSrc: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
}

export default function Timeline({ 
  videoSrc, 
  audioSrc, 
  duration, 
  currentTime, 
  isPlaying,
  onSeek,
  onPlayPause 
}: TimelineProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoTrackRef = useRef<HTMLDivElement>(null);

  // Generate thumbnails
  useEffect(() => {
    if (!videoSrc || !duration) return;

    const generateThumbnails = async () => {
      const video = document.createElement('video');
      video.src = videoSrc;
      video.crossOrigin = 'anonymous';
      await new Promise((resolve) => (video.onloadedmetadata = resolve));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 设定缩略图数量，例如每 5 秒一张，或者固定 10 张
      // 为了视觉效果，我们尽量填满轨道
      const count = 20; 
      const interval = duration / count;
      const thumbs: string[] = [];

      canvas.width = 160; // thumbnail width
      canvas.height = 90; // thumbnail height

      for (let i = 0; i < count; i++) {
        video.currentTime = i * interval;
        await new Promise((resolve) => (video.onseeked = resolve));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
      }
      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [videoSrc, duration]);

  // Handle click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !duration) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onSeek(Math.min(Math.max(0, time), duration));
  };

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  return (
    <div className="w-full bg-[#1e1e1e] text-white border-t border-gray-700 flex flex-col h-64 select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-700 flex items-center px-4 gap-4 bg-[#2d2d2d]">
        <Button 
          type="text" 
          icon={isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />} 
          onClick={onPlayPause}
          className="hover:bg-white/10"
        />
        <span className="font-mono text-sm text-gray-400">
          {new Date(currentTime * 1000).toISOString().substr(11, 8)} / {new Date(duration * 1000).toISOString().substr(11, 8)}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
            <ZoomOut size={16} className="text-gray-400" />
            <Slider 
                min={1} 
                max={5} 
                step={0.1} 
                value={zoom} 
                onChange={setZoom} 
                className="w-24"
                tooltip={{ formatter: null }}
            />
            <ZoomIn size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Tracks Area */}
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
        ref={containerRef}
        onClick={handleTimelineClick}
      >
        <div className="min-w-full h-full relative" style={{ width: `${zoom * 100}%` }}>
            {/* Playhead/Cursor */}
            <div 
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 pointer-events-none"
                style={{ left: `${progressPercent}%` }}
            >
                <div className="w-3 h-3 bg-red-500 transform -translate-x-1.5 rotate-45 -mt-1.5 shadow-md" />
            </div>

            {/* Video Track */}
            <div className="h-24 border-b border-gray-700 relative group bg-black/50 mt-2 mx-2 rounded-md overflow-hidden">
                <div className="absolute inset-0 flex items-center overflow-hidden opacity-80">
                    {thumbnails.map((thumb, idx) => (
                        <img 
                            key={idx} 
                            src={thumb} 
                            alt="frame" 
                            className="h-full object-cover flex-1 w-0 min-w-[100px]" 
                            draggable={false}
                        />
                    ))}
                </div>
                <div className="absolute top-1 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-gray-300 pointer-events-none">
                    Video Track 1
                </div>
            </div>

            {/* Audio Track */}
            <div className="h-20 relative bg-blue-900/20 mt-2 mx-2 rounded-md overflow-hidden border border-blue-500/30">
                <div className="absolute inset-0">
                    {audioSrc && (
                        <WavesurferPlayer 
                            url={audioSrc} 
                            height={78}
                            waveColor="#4f46e5"
                            progressColor="#818cf8"
                            cursorWidth={0}
                            interact={false}
                        />
                    )}
                </div>
                 <div className="absolute top-1 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-gray-300 pointer-events-none z-10">
                    Audio Track 1
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
