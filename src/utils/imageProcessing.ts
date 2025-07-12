/**
 * Image processing utilities for mobile support and optimization
 */

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  size: number;
  hasTransparency?: boolean;
}

/**
 * Validate if file is a valid image before processing
 */
export async function validateImageFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onload = () => {
        cleanup();
        resolve(img.width > 0 && img.height > 0);
      };
      
      img.onerror = () => {
        cleanup();
        resolve(false);
      };
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);
      
      img.src = objectUrl;
    } catch (error) {
      console.warn('Image validation failed:', error);
      resolve(false);
    }
  });
}

/**
 * Check if file is HEIC format
 */
export function isHeicFile(file: File): boolean {
  const isHeicType = file.type === 'image/heic' || file.type === 'image/heif';
  const isHeicExtension = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  return isHeicType || isHeicExtension;
}

/**
 * Convert HEIC images to PNG with robust error handling and fallbacks
 */
export async function convertHeicToPng(file: File): Promise<File> {
  try {
    console.log('Converting HEIC file:', file.name);
    
    // Dynamic import to handle potential library loading issues
    const heic2any = await import('heic2any').then(module => module.default || module);
    
    // Use heic2any library for reliable HEIC conversion
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/png',
      quality: 1.0 // Max quality for PNG
    });
    
    // Handle both single blob and array of blobs
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    // Create new file with PNG extension
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.(heic|heif)$/i, '.png'),
      { type: 'image/png' }
    );
    
    console.log('HEIC conversion successful:', convertedFile.name);
    return convertedFile;
    
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    
    // Create a more user-friendly error message
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'HEIC format not supported in this browser';
    
    throw new Error(`HEIC_CONVERSION_FAILED: ${errorMessage}. Please convert your image to JPEG or PNG format on your device before uploading.`);
  }
}

/**
 * Try native browser HEIC support as fallback
 */
export async function tryNativeHeicConversion(file: File): Promise<File> {
  // First check if browser can handle HEIC natively
  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error('Browser does not support HEIC format natively');
  }
  
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              cleanup();
              if (blob) {
                const convertedFile = new File([blob], 
                  file.name.replace(/\.(heic|heif)$/i, '.png'), 
                  { type: 'image/png' }
                );
                resolve(convertedFile);
              } else {
                reject(new Error('Failed to convert HEIC using native browser support'));
              }
            }, 'image/png');
          } else {
            cleanup();
            reject(new Error('Canvas context not available'));
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      
      img.onerror = () => {
        cleanup();
        reject(new Error('Browser cannot load HEIC image'));
      };
      
      setTimeout(() => {
        cleanup();
        reject(new Error('HEIC conversion timeout'));
      }, 10000);
      
      img.src = objectUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert any image format to PNG with improved error handling
 */
export async function convertImageToPng(file: File): Promise<File> {
  // Handle HEIC files with dedicated converter
  if (isHeicFile(file)) {
    try {
      // Try the heic2any library first
      return await convertHeicToPng(file);
    } catch (error) {
      console.warn('heic2any failed, trying native browser support:', error);
      
      // If heic2any fails, try native browser support (works in Safari)
      try {
        return await tryNativeHeicConversion(file);
      } catch (nativeError) {
        console.error('Both HEIC conversion methods failed:', nativeError);
        
        // Throw a user-friendly error with instructions
        throw new Error('HEIC_NOT_SUPPORTED: Your HEIC image cannot be processed in this browser. Please:\n\n1. Open the image on your iPhone/Mac\n2. Export or save it as JPEG or PNG\n3. Upload the converted file\n\nAlternatively, try using Safari browser which has better HEIC support.');
      }
    }
  }
  
  // First validate the image for other formats
  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error('Invalid or corrupted image file');
  }

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          
          if (ctx) {
            // Clear canvas to transparent (preserves transparency)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              cleanup();
              if (blob) {
                const convertedFile = new File([blob], 
                  file.name.replace(/\.[^/.]+$/, '.png'), 
                  { type: 'image/png' }
                );
                resolve(convertedFile);
              } else {
                reject(new Error('Failed to convert image to PNG format'));
              }
            }, 'image/png');
          } else {
            cleanup();
            reject(new Error('Unable to get canvas rendering context'));
          }
        } catch (error) {
          cleanup();
          reject(new Error(`Image processing failed: ${error.message}`));
        }
      };
      
      img.onerror = (e) => {
        cleanup();
        console.error('Image loading error:', e);
        reject(new Error('Unable to load image - file may be corrupted or in an unsupported format'));
      };
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        cleanup();
        reject(new Error('Image loading timeout - file may be too large or corrupted'));
      }, 10000);
      
      img.src = objectUrl;
    } catch (error) {
      reject(new Error(`Image conversion failed: ${error.message}`));
    }
  });
}

/**
 * Resize image if it's too large (optimize for processing)
 */
export async function optimizeImageSize(file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<File> {
  // Handle HEIC files with conversion first
  if (isHeicFile(file)) {
    const convertedFile = await convertImageToPng(file);
    return optimizeImageSize(convertedFile, maxWidth, maxHeight);
  }
  
  // First validate the image
  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error('Invalid image file for optimization');
  }

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onload = () => {
        try {
          let { width, height } = img;
          
          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (ctx) {
            // Clear canvas to transparent (preserves transparency)
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              cleanup();
              if (blob) {
                const optimizedFile = new File([blob], 
                  file.name.replace(/\.[^/.]+$/, '.png'), 
                  { type: 'image/png' }
                );
                resolve(optimizedFile);
              } else {
                reject(new Error('Failed to optimize image'));
              }
            }, 'image/png');
          } else {
            cleanup();
            reject(new Error('Unable to get canvas context for optimization'));
          }
        } catch (error) {
          cleanup();
          reject(new Error(`Image optimization failed: ${error.message}`));
        }
      };
      
      img.onerror = (e) => {
        cleanup();
        console.error('Image optimization error:', e);
        reject(new Error('Unable to load image for optimization'));
      };
      
      // Set timeout
      setTimeout(() => {
        cleanup();
        reject(new Error('Image optimization timeout'));
      }, 10000);
      
      img.src = objectUrl;
    } catch (error) {
      reject(new Error(`Image optimization failed: ${error.message}`));
    }
  });
}

/**
 * Extract image metadata for analysis
 */
export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  // Handle HEIC files with conversion first
  if (isHeicFile(file)) {
    const convertedFile = await convertImageToPng(file);
    return getImageMetadata(convertedFile);
  }
  
  // First validate the image
  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error('Invalid image file for metadata extraction');
  }

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onload = () => {
        cleanup();
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          format: file.type,
          size: file.size,
          hasTransparency: file.type === 'image/png' || file.type === 'image/webp'
        });
      };
      
      img.onerror = (e) => {
        cleanup();
        console.error('Metadata extraction error:', e);
        reject(new Error('Unable to extract image metadata'));
      };
      
      setTimeout(() => {
        cleanup();
        reject(new Error('Metadata extraction timeout'));
      }, 5000);
      
      img.src = objectUrl;
    } catch (error) {
      reject(new Error(`Metadata extraction failed: ${error.message}`));
    }
  });
}

/**
 * Convert image to base64 for AI processing
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Detect if image contains a person and analyze demographics
 */
export async function analyzeImageContent(file: File): Promise<{
  gender: 'male' | 'female' | 'unknown';
  ageGroup: 'young' | 'adult' | 'mature' | 'unknown';
  attire: 'casual' | 'business' | 'formal' | 'unknown';
  setting: 'indoor' | 'outdoor' | 'studio' | 'unknown';
  quality: 'high' | 'medium' | 'low';
}> {
  // This is a simplified analysis based on image properties
  // In production, you'd use computer vision APIs like Google Vision, AWS Rekognition, etc.
  
  const metadata = await getImageMetadata(file);
  const filename = file.name.toLowerCase();
  
  // Basic heuristics (this could be enhanced with actual AI analysis)
  let gender: 'male' | 'female' | 'unknown' = 'unknown';
  let ageGroup: 'young' | 'adult' | 'mature' | 'unknown' = 'adult'; // default assumption
  let attire: 'casual' | 'business' | 'formal' | 'unknown' = 'unknown';
  const setting: 'indoor' | 'outdoor' | 'studio' | 'unknown' = 'unknown';
  
  // Gender detection from filename
  if (filename.includes('female') || filename.includes('woman') || filename.includes('girl')) {
    gender = 'female';
  } else if (filename.includes('male') || filename.includes('man') || filename.includes('boy')) {
    gender = 'male';
  }
  
  // Age detection from filename
  if (filename.includes('young') || filename.includes('teen') || filename.includes('junior')) {
    ageGroup = 'young';
  } else if (filename.includes('senior') || filename.includes('elder') || filename.includes('mature')) {
    ageGroup = 'mature';
  }
  
  // Attire detection from filename
  if (filename.includes('business') || filename.includes('professional') || filename.includes('corporate')) {
    attire = 'business';
  } else if (filename.includes('formal') || filename.includes('suit') || filename.includes('dress')) {
    attire = 'formal';
  } else if (filename.includes('casual') || filename.includes('tshirt') || filename.includes('jeans')) {
    attire = 'casual';
  }
  
  // Quality assessment based on resolution
  const quality: 'high' | 'medium' | 'low' = 
    metadata.width >= 1024 && metadata.height >= 1024 ? 'high' :
    metadata.width >= 512 && metadata.height >= 512 ? 'medium' : 'low';
  
  return {
    gender,
    ageGroup,
    attire,
    setting,
    quality
  };
}

/**
 * Process and prepare image for AI generation (converts to PNG)
 */
export async function processImageForAI(file: File): Promise<{
  processedFile: File;
  metadata: ImageMetadata;
  analysis: Awaited<ReturnType<typeof analyzeImageContent>>;
  base64: string;
}> {
  let processedFile = file;
  
  // Convert to PNG if not already (handles HEIC automatically)
  if (!processedFile.type.startsWith('image/png')) {
    processedFile = await convertImageToPng(processedFile);
  }
  
  // Optimize size while maintaining PNG format
  processedFile = await optimizeImageSize(processedFile);
  
  // Get metadata and analysis
  const [metadata, analysis, base64] = await Promise.all([
    getImageMetadata(processedFile),
    analyzeImageContent(processedFile),
    imageToBase64(processedFile)
  ]);
  
  return {
    processedFile,
    metadata,
    analysis,
    base64
  };
}