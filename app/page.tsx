import VideoImporter from "@/components/VideoImporter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      <main className="container mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 mb-4">
            Open Cut
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            新一代智能视频处理工具，体验丝滑的音视频分离
          </p>
        </header>
        
        <div className="flex justify-center">
          <VideoImporter />
        </div>
      </main>
    </div>
  );
}
