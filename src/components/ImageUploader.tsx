import { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Image as ImageIcon, Smartphone, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { processImageForAI, type ImageMetadata, isHeicFile } from '../utils/imageProcessing';
import { getImageRecommendations } from '../utils/promptGeneration';
import { blink } from '../blink/client';
import toast from 'react-hot-toast';

interface ProcessedImageData {
  file: File;
  originalFile: File;
  url: string;
  metadata: ImageMetadata;
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

interface ImageUploaderProps {
  onImageProcessed: (data: ProcessedImageData) => void;
  isProcessing?: boolean;
}

export function ImageUploader({ onImageProcessed, isProcessing = false }: ImageUploaderProps) {
  const [uploadedImageData, setUploadedImageData] = useState<ProcessedImageData | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [heicError, setHeicError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/heic', 'image/heif' // iPhone formats
    ];
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/);
    
    if (!isValidType) {
      return 'Please select a valid image file (JPG, PNG, WebP, or HEIC)';
    }

    // Check file size (20MB limit for mobile images)
    if (file.size > 20 * 1024 * 1024) {
      return 'File size must be less than 20MB';
    }

    // Check minimum size
    if (file.size < 1024) {
      return 'File appears to be too small or corrupted';
    }

    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsProcessingImage(true);
    setHeicError(null); // Clear any previous HEIC errors
    
    try {
      toast.loading('Processing your image...', { id: 'processing' });
      
      // Process the image for AI with improved error handling
      const { processedFile, metadata, analysis, base64 } = await processImageForAI(file);
      
      // Calculate quality score and recommendations
      const qualityScore = Math.min(100, 
        (metadata.width >= 512 ? 25 : 10) +
        (metadata.height >= 512 ? 25 : 10) +
        (analysis.quality === 'high' ? 30 : analysis.quality === 'medium' ? 20 : 10) +
        (metadata.aspectRatio >= 0.75 && metadata.aspectRatio <= 1.33 ? 20 : 10) +
        (analysis.attire === 'business' || analysis.attire === 'formal' ? 10 : 5)
      );
      
      const recommendations = getImageRecommendations(analysis, metadata);
      
      const imageData: ProcessedImageData = {
        file: processedFile,
        originalFile: file,
        url: (await blink.storage.upload(
          processedFile, 
          `headshots/${Date.now()}-${processedFile.name}`,
          { upsert: true }
        )).publicUrl, // Upload the processed image to get an HTTPS URL
        metadata,
        analysis,
        base64,
        qualityScore,
        recommendations
      };
      
      setUploadedImageData(imageData);
      onImageProcessed(imageData);
      
      toast.success('Image processed successfully!', { id: 'processing' });
      
      // Show conversion message if needed
      if (isHeicFile(file)) {
        toast.success('HEIC image converted to PNG for compatibility');
      } else if (file.type !== 'image/png') {
        toast.success('Image converted to PNG for optimal AI processing');
      }
      
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Handle HEIC-specific errors with detailed guidance
      let errorMessage = 'Failed to process image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('HEIC_CONVERSION_FAILED') || error.message.includes('HEIC_NOT_SUPPORTED')) {
          setHeicError(error.message);
          errorMessage = 'HEIC conversion failed. See instructions below.';
        } else if (error.message.includes('Invalid or corrupted')) {
          errorMessage = 'The image file appears to be corrupted or in an unsupported format. Please try a different image.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Image processing timed out. The file may be too large. Please try a smaller image.';
        } else if (error.message.includes('canvas')) {
          errorMessage = 'Unable to process image due to browser limitations. Please try a different browser or smaller image.';
        } else if (error.message.includes('metadata')) {
          errorMessage = 'Unable to read image information. Please ensure the file is a valid image.';
        } else if (error.message.includes('PNG format')) {
          errorMessage = 'Failed to convert image to PNG format. Please try a different image or browser.';
        }
      }
      
      toast.error(errorMessage, { id: 'processing' });
    } finally {
      setIsProcessingImage(false);
    }
  }, [onImageProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getQualityText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-4">
      <Card className={`border-2 border-dashed transition-colors ${
        isProcessingImage 
          ? 'border-indigo-300 bg-indigo-50/50' 
          : 'border-gray-200 hover:border-indigo-300'
      }`}>
        <CardContent className="p-6">
          <div
            className="space-y-4 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {uploadedImageData ? (
              <div className="space-y-4">
                <div className="relative mx-auto w-48 h-48 rounded-xl overflow-hidden">
                  <img
                    src={uploadedImageData.url}
                    alt="Uploaded"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage || isProcessing}
                    >
                      Change Photo
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600">Photo ready for processing</span>
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <Badge variant={getQualityBadgeVariant(uploadedImageData.qualityScore)}>
                    Quality: {getQualityText(uploadedImageData.qualityScore)} ({uploadedImageData.qualityScore}%)
                  </Badge>
                  <Badge variant="outline">
                    {uploadedImageData.metadata.width}×{uploadedImageData.metadata.height}
                  </Badge>
                </div>

                {uploadedImageData.recommendations.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {uploadedImageData.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isProcessingImage ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Processing Image...</h3>
                      <p className="text-gray-600">Converting and optimizing your photo</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Upload Your Photo</h3>
                      <p className="text-gray-600">Drag and drop or click to select</p>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <Smartphone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">iPhone HEIC supported</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* HEIC Error Instructions */}
      {heicError && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="space-y-3">
              <p className="font-semibold">HEIC Conversion Failed</p>
              <p className="text-sm">Your iPhone HEIC image couldn't be processed. Here's how to fix it:</p>
              <div className="space-y-2 text-sm">
                <p><strong>Option 1 - iPhone Settings:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Go to Settings → Camera → Formats</li>
                  <li>Select "Most Compatible" instead of "High Efficiency"</li>
                  <li>Take a new photo and upload it</li>
                </ol>
                
                <p><strong>Option 2 - Convert Existing Photo:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Open the photo in your Photos app</li>
                  <li>Tap Share → Copy Photo</li>
                  <li>Paste into Files app and save as JPEG</li>
                  <li>Upload the JPEG file</li>
                </ol>
                
                <p><strong>Option 3 - Use Safari:</strong></p>
                <p className="ml-4">Try uploading using Safari browser which has better HEIC support.</p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.open('https://support.apple.com/en-us/102256', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Apple Support Guide
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📱 Mobile Upload Tips</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• iPhone users: HEIC photos are automatically converted</li>
            <li>• Use well-lit photos for best AI results</li>
            <li>• Face the camera directly, avoid sunglasses</li>
            <li>• Professional or business attire works best</li>
            <li>• Minimum 512×512 pixels recommended</li>
            <li>• If HEIC fails, try Safari browser or convert to JPEG first</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}