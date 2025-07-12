import { useState } from 'react';
import { Sparkles, Wand2, Download, Copy, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { blink } from '../blink/client';
import { generateBatchPrompts } from '../utils/promptGeneration';
import toast from 'react-hot-toast';

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

interface GeneratedImage {
  id?: string;
  url: string;
  style: string;
  prompt: string;
  index: number;
  timestamp?: number;
}

interface HeadshotGeneratorProps {
  imageData: ProcessedImageData | null;
}

export function HeadshotGenerator({ imageData }: HeadshotGeneratorProps) {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageCount, setImageCount] = useState([4]);
  const [currentBatch, setCurrentBatch] = useState(0);

  const generateHeadshots = async () => {
    if (!imageData) {
      toast.error('Please upload an image first');
      return;
    }

    const count = imageCount[0];
    setIsGenerating(true);
    setProgress(0);
    setCurrentBatch(prev => prev + 1);
    
    try {
      toast.loading(`Transforming your photo into ${count} professional headshots...`, { id: 'generating' });
      
      // Ensure we have a proper HTTPS URL for the API
      let imageUrl = imageData.url;
      
      // If URL is not HTTPS, upload the file to get proper URL
      if (!imageUrl.startsWith('https://')) {
        console.log('Uploading image to get HTTPS URL...');
        const { publicUrl } = await blink.storage.upload(
          imageData.file,
          `headshots/${Date.now()}-${imageData.file.name}`,
          { upsert: true }
        );
        imageUrl = publicUrl;
        console.log('Got HTTPS URL:', imageUrl);
      }
      
      // Generate personalized prompts based on the uploaded image
      const { prompts, metadata } = generateBatchPrompts(
        imageData.analysis, 
        imageData.metadata, 
        count
      );
      
      setProgress(10);
      
      const images: GeneratedImage[] = [];
      const batchSize = 2; // Generate in smaller batches for better performance
      
      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batchPrompts = prompts.slice(i, i + batchSize);
        const batchPromises = batchPrompts.map(async (prompt, batchIndex) => {
          try {
            const actualIndex = i + batchIndex;
            console.log(`Generating headshot ${actualIndex + 1} with HTTPS URL:`, imageUrl);
            
            // Use the HTTPS image URL for AI generation
            const { data } = await blink.ai.modifyImage({
              images: [imageUrl], // Use HTTPS URL
              prompt: `Generate professional business headshot with studio lighting for this person. ${prompt}`,
              quality: 'high',
              n: 1
            });
            
            return {
              url: data[0].url,
              style: metadata.suggestedStyles[actualIndex] || `Style ${actualIndex + 1}`,
              prompt,
              index: actualIndex
            };
          } catch (error) {
            console.error(`Error generating headshot ${i + batchIndex + 1}:`, error);
            throw error;
          }
        });
        
        try {
          const batchResults = await Promise.all(batchPromises);
          images.push(...batchResults);
          setProgress(10 + ((i + batchSize) / prompts.length) * 85);
        } catch {
          // If batch fails, try individual generation
          for (const [batchIndex, prompt] of batchPrompts.entries()) {
            try {
              const actualIndex = i + batchIndex;
              console.log(`Retrying individual headshot ${actualIndex + 1} with HTTPS URL:`, imageUrl);
              
              // Use the HTTPS image URL for individual retry
              const { data } = await blink.ai.modifyImage({
                images: [imageUrl], // Use HTTPS URL
                prompt: `Generate professional business headshot with studio lighting for this person. ${prompt}`,
                quality: 'high',
                n: 1
              });
              
              images.push({
                url: data[0].url,
                style: metadata.suggestedStyles[actualIndex] || `Style ${actualIndex + 1}`,
                prompt,
                index: actualIndex
              });
              
              setProgress(10 + ((i + batchIndex + 1) / prompts.length) * 85);
            } catch (individualError) {
              console.error(`Error generating individual headshot ${actualIndex + 1}:`, individualError);
              // Continue with other images
            }
          }
        }
        
        // Add small delay between batches
        if (i + batchSize < prompts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (images.length === 0) {
        throw new Error('Failed to generate any headshots');
      }

      setGeneratedImages(prev => [...prev, ...images]);
      setProgress(100);
      
      toast.success(`Successfully transformed your photo into ${images.length} professional headshots!`, { id: 'generating' });
      
    } catch (error) {
      console.error('Error generating headshots:', error);
      toast.error('Failed to generate headshots. Please try again.', { id: 'generating' });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const downloadImage = async (imageUrl: string, style: string, index: number) => {
    try {
      toast.loading('Downloading image...', { id: 'download' });
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${style.toLowerCase().replace(/\s+/g, '-')}-headshot-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully!', { id: 'download' });
    } catch {
      toast.error('Failed to download image', { id: 'download' });
    }
  };

  const copyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast.success('Image URL copied to clipboard!');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const regenerateImage = async (index: number) => {
    if (!imageData) return;
    
    const imageToRegenerate = generatedImages[index];
    if (!imageToRegenerate) return;
    
    try {
      toast.loading('Regenerating image...', { id: `regen-${index}` });
      
      // Ensure we have a proper HTTPS URL for the API
      let imageUrl = imageData.url;
      
      // If URL is not HTTPS, upload the file to get proper URL
      if (!imageUrl.startsWith('https://')) {
        console.log('Uploading image to get HTTPS URL for regeneration...');
        const { publicUrl } = await blink.storage.upload(
          imageData.file,
          `headshots/${Date.now()}-${imageData.file.name}`,
          { upsert: true }
        );
        imageUrl = publicUrl;
        console.log('Got HTTPS URL for regeneration:', imageUrl);
      }
      
      // Use the HTTPS image URL for regeneration
      const { data } = await blink.ai.modifyImage({
        images: [imageUrl], // Use HTTPS URL
        prompt: `Generate professional business headshot with studio lighting for this person. ${imageToRegenerate.prompt}`,
        quality: 'high',
        n: 1
      });
      
      const newImage = {
        ...imageToRegenerate,
        url: data[0].url
      };
      
      setGeneratedImages(prev => 
        prev.map((img, i) => i === index ? newImage : img)
      );
      
      toast.success('Image regenerated successfully!', { id: `regen-${index}` });
    } catch (error) {
      console.error('Error regenerating image:', error);
      toast.error('Failed to regenerate image', { id: `regen-${index}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold text-gray-900">
                Number of Images: {imageCount[0]}
              </Label>
              <div className="mt-2">
                <Slider
                  value={imageCount}
                  onValueChange={setImageCount}
                  max={8}
                  min={1}
                  step={1}
                  className="w-full"
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>4 (Recommended)</span>
                  <span>8</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={generateHeadshots}
              disabled={!imageData || isGenerating}
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg py-6"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                  Transforming Your Photo...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Transform Into {imageCount[0]} Professional Headshots
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Transforming your photo into professional headshots...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Images */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">
            Your Professional Headshots
            {generatedImages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {generatedImages.length} generated
              </Badge>
            )}
          </h3>
          
          {generatedImages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const zip = generatedImages.map((img, i) => downloadImage(img.url, img.style, i));
                Promise.all(zip);
              }}
              disabled={isGenerating}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          )}
        </div>

        {generatedImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generatedImages.map((image, index) => (
              <Card key={`${currentBatch}-${index}`} className="overflow-hidden group hover:shadow-lg transition-all duration-200">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={image.url}
                      alt={`${image.style} headshot`}
                      className="w-full h-64 object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => downloadImage(image.url, image.style, index)}
                          variant="secondary"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => copyImageUrl(image.url)}
                          variant="secondary"
                          size="sm"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => regenerateImage(index)}
                          variant="secondary"
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{image.style}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      Professional headshot style
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Your headshots will appear here
              </h4>
              <p className="text-gray-600">
                Upload a photo and click generate to see your AI-powered professional headshots
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}