'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Button, message, Progress, Spin, Card, Typography, Space } from 'antd';
import { UploadOutlined, VideoCameraOutlined, SoundOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;

export default function VideoImporter() {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingText, setProcessingText] = useState('');
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<any>(null);

  const load = async () => {
    setIsLoading(true);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
       // progress is 0-1
       setProgress(Math.round(progress * 100));
    });

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
  }, []);

  const processVideo = async (file: File) => {
    if (!loaded) return;
    
    const ffmpeg = ffmpegRef.current;
    setProcessingText('正在写入文件...');
    setProgress(0);
    
    try {
      const fileName = 'input.mp4';
      await ffmpeg.writeFile(fileName, await fetchFile(file));

      // 1. Extract Audio
      setProcessingText('正在分离音频轨道...');
      // -vn: disable video, -acodec copy: copy audio stream without re-encoding (fast)
      // use .mp3 for better browser compatibility in audio tag if source is weird, but aac is standard for mp4
      // To be safe and ensure playback, let's re-encode to mp3 or use copy if we know it's supported.
      // Re-encoding ensures it plays in browser <audio> tag.
      await ffmpeg.exec(['-i', fileName, '-vn', 'output.mp3']);
      
      const audioData = await ffmpeg.readFile('output.mp3');
      const audioBlob = new Blob([audioData as any], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);

      // 2. Extract Video (Mute)
      setProcessingText('正在分离视频轨道...');
      // -an: disable audio, -vcodec copy: copy video stream
      await ffmpeg.exec(['-i', fileName, '-an', '-c:v', 'copy', 'output.mp4']);
      
      const videoData = await ffmpeg.readFile('output.mp4');
      const videoBlob = new Blob([videoData as any], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      setVideoSrc(videoUrl);

      setProcessingText('');
      message.success('解析完成！');
    } catch (error) {
      console.error(error);
      message.error('视频处理失败');
      setProcessingText('');
    }
  };

  const handleUpload = async (info: any) => {
    const file = info.file;
    if (!file) return;
    
    // Ant Design Upload behavior
    // We use beforeUpload to capture file and process manually
    return false; 
  };

  const props = {
    beforeUpload: (file: File) => {
      if (!loaded) {
        message.warning('核心组件正在加载中，请稍后...');
        return false;
      }
      processVideo(file);
      return false; // Prevent default upload behavior
    },
    showUploadList: false,
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="shadow-xl rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-2">视频轨道分离器</Title>
          <Text type="secondary">浏览器端自动解析，安全高效</Text>
        </div>

        {!loaded && isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
             <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
             <div className="mt-4 text-gray-500">正在加载核心组件...</div>
          </div>
        )}

        {loaded && !videoSrc && !processingText && (
          <div className="flex justify-center py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors bg-gray-50">
            <Upload {...props}>
              <div className="flex flex-col items-center cursor-pointer">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <UploadOutlined style={{ fontSize: '32px' }} />
                </div>
                <div className="text-lg font-medium text-gray-700">点击上传视频文件</div>
                <div className="text-sm text-gray-400 mt-2">支持 MP4, MOV 等常见格式</div>
              </div>
            </Upload>
          </div>
        )}

        {processingText && (
          <div className="py-12 text-center">
             <Spin size="large" />
             <div className="mt-4 text-lg font-medium text-blue-600">{processingText}</div>
             {/* FFmpeg progress is not always reliable for simple copy operations, so we show indeterminate or text */}
          </div>
        )}

        {(videoSrc || audioSrc) && (
          <div className="space-y-8 animate-fade-in">
            {videoSrc && (
              <div className="bg-black rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-2">
                  <VideoCameraOutlined />
                  <span className="text-sm font-medium">视频轨道 (无声)</span>
                </div>
                <video 
                  src={videoSrc} 
                  controls 
                  className="w-full aspect-video object-contain"
                />
              </div>
            )}

            {audioSrc && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-gray-700">
                  <SoundOutlined />
                  <span className="text-sm font-medium">音频轨道</span>
                </div>
                <audio 
                  src={audioSrc} 
                  controls 
                  className="w-full"
                />
              </div>
            )}

            <div className="flex justify-center pt-4">
               <Button 
                 size="large" 
                 onClick={() => {
                   setVideoSrc(null);
                   setAudioSrc(null);
                 }}
               >
                 处理新视频
               </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
