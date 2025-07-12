import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from './components/ui/badge'
import { ImageUploader } from './components/ImageUploader'
import { HeadshotGenerator } from './components/HeadshotGenerator'
import { Toaster } from 'react-hot-toast'
import { blink } from './blink/client'

interface ProcessedImageData {
  file: File;
  originalFile: File;
  url: string;
  metadata: {
    width: number;
    height: number;
    aspectRatio: number;
    format: string;
    size: number;
  };
  analysis: {
    gender: 'male' | 'female' | 'unknown';
    ageGroup: 'young' | 'adult' | 'mature' | 'unknown';
    attire: 'casual' | 'business' | 'formal' | 'unknown';
    setting: 'indoor' | 'outdoor' | 'studio' | 'unknown';
    quality: 'high' | 'medium' | 'low';
  };
  base64: string;
  qualityScore: number;
  recommendations: string[];
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageData, setImageData] = useState<ProcessedImageData | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Loading AI Headshot Studio...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Headshot Studio Pro</h1>
            <p className="text-gray-600">Sign in to create professional headshots with AI</p>
          </div>
          <button
            onClick={() => blink.auth.login()}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
          },
        }}
      />
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Headshot Studio Pro</h1>
                <p className="text-sm text-gray-600">Professional headshots powered by advanced AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Welcome, {user.displayName || user.email}</p>
                <button
                  onClick={() => blink.auth.logout()}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Multi-Generation
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Transform Your Photo Into 
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Professional Headshots</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your photo and our AI will transform it into 1-8 professional headshots while preserving your unique features and identity.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">1. Upload Your Photo</h3>
            <ImageUploader 
              onImageProcessed={setImageData}
              isProcessing={false}
            />
            
            {imageData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✅ Image Analysis Complete</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Quality Score:</span> 
                    <span className="font-medium ml-1">{imageData.qualityScore}%</span>
                  </div>
                  <div>
                    <span className="text-green-700">Resolution:</span> 
                    <span className="font-medium ml-1">{imageData.metadata.width}×{imageData.metadata.height}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Detected:</span> 
                    <span className="font-medium ml-1 capitalize">{imageData.analysis.gender} {imageData.analysis.ageGroup}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Attire:</span> 
                    <span className="font-medium ml-1 capitalize">{imageData.analysis.attire}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generation Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">2. Transform Into Professional Headshots</h3>
            <HeadshotGenerator imageData={imageData} />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 border-t pt-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Enhanced AI Headshot Features</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our advanced AI analyzes your uploaded photo to create personalized, professional headshots with multiple styles and formats.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Smart Analysis</h4>
              <p className="text-gray-600">
                AI analyzes your uploaded photo and transforms it while preserving your unique features
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Multiple Styles</h4>
              <p className="text-gray-600">
                Transform your photo into 1-8 headshots with different professional styles and backgrounds
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Mobile Friendly</h4>
              <p className="text-gray-600">
                Supports iPhone HEIC format and automatic image conversion
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Batch Download</h4>
              <p className="text-gray-600">
                Download all generated images or regenerate individual headshots
              </p>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">💡 Pro Tips for Best Results</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">📸 Photo Quality</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use high resolution (512×512 minimum)</li>
                <li>• Ensure good lighting</li>
                <li>• Face the camera directly</li>
                <li>• Avoid shadows on face</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">👔 Appearance</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Wear professional attire</li>
                <li>• Avoid sunglasses or hats</li>
                <li>• Clean, simple background</li>
                <li>• Natural expression</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">📱 Mobile Users</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• HEIC images automatically converted</li>
                <li>• Portrait mode photos work great</li>
                <li>• Use front or back camera</li>
                <li>• Up to 20MB file size supported</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App