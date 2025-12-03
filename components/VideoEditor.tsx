'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Button, message, Spin, Card, Typography } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import Timeline from './Timeline';

const { Title } = Typography;

export default function VideoEditor() {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingText, setProcessingText] = useState('');
  
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);

  const load = async () => {
    setIsLoading(true);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      message.error('FFmpeg 加载失败，请检查网络连接');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Sync loop
  useEffect(() => {
    const sync = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        animationFrameRef.current = requestAnimationFrame(sync);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(sync);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying]);

  const processVideo = async (file: File) => {
    if (!loaded) return;
    
    const ffmpeg = ffmpegRef.current;
    setProcessingText('正在解析媒体文件...');
    
    try {
      const fileName = 'input.mp4';
      await ffmpeg.writeFile(fileName, await fetchFile(file));

      // 1. Extract Audio
      setProcessingText('正在分离音频...');
      await ffmpeg.exec(['-i', fileName, '-vn', 'output.mp3']);
      const audioData = await ffmpeg.readFile('output.mp3');
      const audioBlob = new Blob([audioData as any], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);

      // 2. Extract Video (Mute) for track logic, but for main preview we might use original or muted
      // To simulate "tracks", we use muted video + separate audio
      setProcessingText('正在分离视频...');
      await ffmpeg.exec(['-i', fileName, '-an', '-c:v', 'copy', 'output.mp4']);
      const videoData = await ffmpeg.readFile('output.mp4');
      const videoBlob = new Blob([videoData as any], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      setVideoSrc(videoUrl);

      setProcessingText('');
      message.success('导入成功！');
    } catch (error) {
      console.error(error);
      message.error('视频处理失败');
      setProcessingText('');
    }
  };

  const togglePlay = () => {
    if (videoRef.current && audioRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current.pause();
      } else {
        // Sync start
        const t = videoRef.current.currentTime;
        // Ensure sync
        if (Math.abs(audioRef.current.currentTime - t) > 0.1) {
             audioRef.current.currentTime = t;
        }
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioRef.current?.play();
            }).catch(error => {
                console.error("Play error:", error);
            });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = time;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const props = {
    beforeUpload: (file: File) => {
      if (!loaded) {
        message.warning('核心组件正在加载中，请稍后...');
        return false;
      }
      processVideo(file);
      return false;
    },
    showUploadList: false,
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
       {/* Header */}
       <header className="h-14 border-b border-zinc-800 flex items-center px-6 justify-between bg-zinc-900 shrink-0">
          <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Cut-Han</div>
          <div className="flex gap-4">
             <Button type="primary" size="small" disabled={!videoSrc}>导出视频</Button>
          </div>
       </header>

       {/* Main Content */}
       <div className="flex-1 flex flex-col min-h-0">
          {/* Preview Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center p-8">
             {!videoSrc && !processingText && (
                <div className="text-center">
                    <Upload {...props}>
                        <Button type="dashed" size="large" icon={<UploadOutlined />} className="text-gray-400 border-gray-600 hover:text-blue-500 hover:border-blue-500">
                            导入视频素材
                        </Button>
                    </Upload>
                    <div className="mt-4 text-gray-500 text-sm">
                        {!loaded ? <span className="flex items-center justify-center gap-2"><LoadingOutlined /> 正在初始化引擎...</span> : '支持 MP4, MOV 格式'}
                    </div>
                </div>
             )}

             {processingText && (
                 <div className="flex flex-col items-center">
                    <Spin size="large" />
                    <div className="mt-4 text-gray-400">{processingText}</div>
                 </div>
             )}

             {videoSrc && (
                 // Using muted video element for visual, synced with hidden audio element
                 <video 
                    ref={videoRef}
                    src={videoSrc}
                    className="max-w-full max-h-full shadow-2xl"
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    onClick={togglePlay}
                    muted // Important: We play audio separately
                    playsInline
                 />
             )}
             
             {/* Hidden Audio Element for Track 2 */}
             {audioSrc && (
                 <audio ref={audioRef} src={audioSrc} />
             )}
          </div>

          {/* Timeline Area */}
          <div className="h-64 shrink-0 z-10">
              <Timeline 
                videoSrc={videoSrc}
                audioSrc={audioSrc}
                duration={duration}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeek={handleSeek}
                onPlayPause={togglePlay}
              />
          </div>
       </div>
    </div>
  );
}
