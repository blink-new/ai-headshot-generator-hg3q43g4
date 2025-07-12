import type { ImageMetadata } from './imageProcessing';

export interface PersonAnalysis {
  gender: 'male' | 'female' | 'unknown';
  ageGroup: 'young' | 'adult' | 'mature' | 'unknown';
  attire: 'casual' | 'business' | 'formal' | 'unknown';
  setting: 'indoor' | 'outdoor' | 'studio' | 'unknown';
  quality: 'high' | 'medium' | 'low';
}

/**
 * Generate personalized headshot prompts based on image analysis
 */
export function generateHeadshotPrompts(
  analysis: PersonAnalysis,
  metadata: ImageMetadata,
  count: number = 4
): string[] {
  // Base quality settings
  const qualitySettings = 'high resolution, studio photography, professional lighting, sharp focus, clean composition';
  
  // Style variations for different professional contexts
  const styleVariations = [
    {
      name: 'Corporate Executive',
      background: 'clean white background',
      attire: 'formal business suit',
      lighting: 'professional studio lighting with soft shadows',
      mood: 'confident and approachable expression',
      style: 'corporate headshot photography style'
    },
    {
      name: 'Creative Professional', 
      background: 'subtle gradient background',
      attire: 'modern business attire',
      lighting: 'warm natural lighting',
      mood: 'friendly and creative expression',
      style: 'contemporary portrait photography'
    },
    {
      name: 'LinkedIn Profile',
      background: 'soft blue professional background',
      attire: 'business casual outfit',
      lighting: 'even studio lighting',
      mood: 'professional smile and direct eye contact',
      style: 'social media profile photography'
    },
    {
      name: 'Executive Portrait',
      background: 'neutral gray backdrop',
      attire: 'premium business formal wear',
      lighting: 'dramatic professional lighting',
      mood: 'serious and trustworthy demeanor',
      style: 'executive portrait photography'
    },
    {
      name: 'Approachable Professional',
      background: 'soft warm background blur',
      attire: 'smart casual business attire',
      lighting: 'soft diffused lighting',
      mood: 'warm smile and engaging expression',
      style: 'lifestyle business photography'
    },
    {
      name: 'Tech Professional',
      background: 'minimalist clean background',
      attire: 'modern business casual',
      lighting: 'crisp even lighting',
      mood: 'innovative and focused expression',
      style: 'tech industry headshot style'
    }
  ];

  // Select styles based on count requested
  const selectedStyles = styleVariations.slice(0, Math.min(count, styleVariations.length));
  
  return selectedStyles.map(style => {
    return `Professional headshot transformation: ${style.background}, wearing ${style.attire}, ${style.lighting}, ${style.mood}, ${style.style}, ${qualitySettings}, maintain original facial features and identity, photorealistic transformation, 85mm lens, commercial photography quality`;
  });
}

/**
 * Generate batch prompts for multiple image generation
 */
export function generateBatchPrompts(
  analysis: PersonAnalysis,
  metadata: ImageMetadata,
  batchSize: number = 4
): {
  prompts: string[];
  metadata: {
    suggestedStyles: string[];
    qualityScore: number;
  }
} {
  const prompts = generateHeadshotPrompts(analysis, metadata, batchSize);
  
  // Calculate quality score based on image analysis
  const qualityScore = calculateQualityScore(analysis, metadata);
  
  // Extract style names for UI display
  const suggestedStyles = [
    'Corporate Executive',
    'Creative Professional', 
    'LinkedIn Profile',
    'Executive Portrait'
  ].slice(0, batchSize);

  return {
    prompts,
    metadata: {
      suggestedStyles,
      qualityScore
    }
  };
}

/**
 * Calculate a quality score for the uploaded image
 */
function calculateQualityScore(analysis: PersonAnalysis, metadata: ImageMetadata): number {
  let score = 0;
  
  // Resolution score (0-40 points)
  if (metadata.width >= 1024 && metadata.height >= 1024) {
    score += 40;
  } else if (metadata.width >= 512 && metadata.height >= 512) {
    score += 25;
  } else {
    score += 10;
  }
  
  // Aspect ratio score (0-20 points) - prefer portrait or square
  const aspectRatio = metadata.aspectRatio;
  if (aspectRatio >= 0.75 && aspectRatio <= 1.33) { // Portrait to slightly landscape
    score += 20;
  } else if (aspectRatio >= 0.5 && aspectRatio <= 2) {
    score += 10;
  } else {
    score += 5;
  }
  
  // Quality assessment score (0-20 points)
  if (analysis.quality === 'high') {
    score += 20;
  } else if (analysis.quality === 'medium') {
    score += 15;
  } else {
    score += 5;
  }
  
  // File size score (0-10 points) - not too small, not too large
  const sizeMB = metadata.size / (1024 * 1024);
  if (sizeMB >= 0.5 && sizeMB <= 5) {
    score += 10;
  } else if (sizeMB >= 0.1 && sizeMB <= 10) {
    score += 5;
  }
  
  // Bonus points for professional context (0-10 points)
  if (analysis.attire === 'business' || analysis.attire === 'formal') {
    score += 10;
  } else if (analysis.attire === 'casual') {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Get recommendations for improving image quality
 */
export function getImageRecommendations(
  analysis: PersonAnalysis,
  metadata: ImageMetadata
): string[] {
  const recommendations: string[] = [];
  const qualityScore = calculateQualityScore(analysis, metadata);
  
  if (qualityScore < 70) {
    if (metadata.width < 512 || metadata.height < 512) {
      recommendations.push('Use a higher resolution image (at least 512x512 pixels) for better results');
    }
    
    if (analysis.quality === 'low') {
      recommendations.push('Try using a clearer, well-lit photo for optimal AI generation');
    }
    
    if (metadata.aspectRatio < 0.5 || metadata.aspectRatio > 2) {
      recommendations.push('Use a portrait or square-oriented photo that focuses on the face');
    }
    
    if (analysis.attire === 'unknown') {
      recommendations.push('Wearing professional attire in the photo will improve headshot results');
    }
  }
  
  return recommendations;
}