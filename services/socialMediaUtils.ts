export interface SocialMediaLinkInfo {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'unknown';
  cleanUrl: string;
  originalUrl: string;
  username?: string;
  videoId?: string;
  isShortLink: boolean;
  wasExpanded: boolean;
  searchHints: string[];
}

const TRACKING_PARAMS_TO_REMOVE = [
  'ttclid',
  'is_from_webapp',
  'sender_device',
  'is_copy_url',
  'web_id',
  'share_item_id',
  'share_app_id',
  'share_author_id',
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'igshid',
  'ref',
  'feature',
  'si',
  'pp',
  't',
  'share_id',
  'amp',
];

export function sanitizeSocialMediaUrl(url: string): string {
  try {
    const urlObj = new URL(url.trim());
    
    TRACKING_PARAMS_TO_REMOVE.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    const cleanedParams = urlObj.searchParams.toString();
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    
    return cleanedParams ? `${baseUrl}?${cleanedParams}` : baseUrl;
  } catch (e) {
    return url;
  }
}

export function extractTikTokInfo(url: string): SocialMediaLinkInfo {
  const cleanUrl = sanitizeSocialMediaUrl(url);
  
  const isShortLink = /^https?:\/\/(vm|vt|m)\.tiktok\.com/i.test(url);
  const isWebappLink = url.includes('is_from_webapp') || url.includes('sender_device');
  
  const usernamePatterns = [
    /@([a-zA-Z0-9_.-]+)/,
    /tiktok\.com\/([a-zA-Z0-9_.-]+)\/video/,
  ];
  
  const videoIdPatterns = [
    /\/video\/(\d{15,25})/,
    /item_id=(\d{15,25})/,
    /\/v\/(\d{15,25})/,
  ];
  
  let username: string | undefined;
  let videoId: string | undefined;
  
  for (const pattern of usernamePatterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      username = match[1].replace(/^@/, '');
      break;
    }
  }
  
  for (const pattern of videoIdPatterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      videoId = match[1];
      break;
    }
  }
  
  const canonicalUrl = username && videoId 
    ? `https://www.tiktok.com/@${username}/video/${videoId}`
    : cleanUrl;
  
  const searchHints: string[] = [];
  
  if (videoId) {
    searchHints.push(`tiktok video ${videoId}`);
    searchHints.push(`site:tiktok.com "${videoId}"`);
  }
  
  if (username) {
    searchHints.push(`@${username} tiktok cocktail recipe`);
    if (videoId) {
      searchHints.push(`@${username} ${videoId} recipe ingredients`);
    }
  }
  
  searchHints.push(`"${canonicalUrl}" recipe`);
  
  return {
    platform: 'tiktok',
    cleanUrl: canonicalUrl,
    originalUrl: url,
    username,
    videoId,
    isShortLink,
    wasExpanded: false,
    searchHints,
  };
}

export function extractInstagramInfo(url: string): SocialMediaLinkInfo {
  const cleanUrl = sanitizeSocialMediaUrl(url);
  
  const usernameMatch = cleanUrl.match(/instagram\.com\/(?:p\/|reel\/)?([a-zA-Z0-9_.-]+)/);
  const postIdMatch = cleanUrl.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  
  const username = usernameMatch ? usernameMatch[1] : undefined;
  const videoId = postIdMatch ? postIdMatch[1] : undefined;
  
  const searchHints: string[] = [];
  
  if (videoId) {
    searchHints.push(`instagram reel ${videoId} recipe`);
  }
  
  if (username && username !== 'p' && username !== 'reel') {
    searchHints.push(`@${username} instagram cocktail recipe`);
  }
  
  return {
    platform: 'instagram',
    cleanUrl,
    originalUrl: url,
    username: username !== 'p' && username !== 'reel' ? username : undefined,
    videoId,
    isShortLink: false,
    wasExpanded: false,
    searchHints,
  };
}

export function extractYouTubeInfo(url: string): SocialMediaLinkInfo {
  const cleanUrl = sanitizeSocialMediaUrl(url);
  
  const videoIdPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  let videoId: string | undefined;
  
  for (const pattern of videoIdPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      videoId = match[1];
      break;
    }
  }
  
  const channelMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
  const username = channelMatch ? channelMatch[1] : undefined;
  
  const searchHints: string[] = [];
  
  if (videoId) {
    searchHints.push(`youtube "${videoId}" cocktail recipe`);
    searchHints.push(`site:youtube.com "${videoId}" ingredients`);
  }
  
  return {
    platform: 'youtube',
    cleanUrl,
    originalUrl: url,
    username,
    videoId,
    isShortLink: url.includes('youtu.be'),
    wasExpanded: false,
    searchHints,
  };
}

export function analyzeSocialMediaLink(url: string): SocialMediaLinkInfo {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com')) {
    return extractTikTokInfo(url);
  }
  
  if (lowerUrl.includes('instagram.com')) {
    return extractInstagramInfo(url);
  }
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return extractYouTubeInfo(url);
  }
  
  return {
    platform: 'unknown',
    cleanUrl: sanitizeSocialMediaUrl(url),
    originalUrl: url,
    isShortLink: false,
    wasExpanded: false,
    searchHints: [],
  };
}

export function generateSearchSystemPrompt(linkInfo: SocialMediaLinkInfo): string {
  if (linkInfo.platform === 'tiktok') {
    return `
[SOCIAL MEDIA VIDEO ANALYSIS - TIKTOK]

The user has shared a TikTok video link. Your task is to extract the cocktail recipe shown in this video.

CLEANED URL: ${linkInfo.cleanUrl}
${linkInfo.username ? `CREATOR: @${linkInfo.username}` : ''}
${linkInfo.videoId ? `VIDEO ID: ${linkInfo.videoId}` : ''}
${linkInfo.isShortLink ? 'NOTE: This was a shortened link that has been expanded.' : ''}

=== CRITICAL VIDEO CONTENT EXTRACTION STRATEGY ===

Since you cannot directly view video pixels, you MUST use Google Search to find the video's textual content:

1. **SEARCH FOR THE VIDEO DIRECTLY**
   ${linkInfo.searchHints.map((hint, i) => `   Query ${i + 1}: "${hint}"`).join('\n')}

2. **WHAT TO LOOK FOR IN SEARCH RESULTS:**
   - Video CAPTION/DESCRIPTION (often contains ingredient list or recipe name)
   - TRANSCRIPT or closed captions text
   - COMMENTS mentioning ingredients ("what's in this?" responses)
   - Cross-posts on other platforms (Reddit, Twitter) discussing the video
   - Recipe blogs that featured or referenced this video

3. **RECIPE DEDUCTION RULES:**
   - If you find the cocktail NAME but not full specs, use your mixology knowledge to provide the standard recipe
   - If it's a "riff" or variation, prioritize any mentioned modifications
   - If search finds partial ingredients, deduce the rest based on the drink family

4. **TIKTOK-SPECIFIC TIPS:**
   - Bartender TikTokers often put ingredients in the first comment, not the caption
   - Look for "recipe in bio" mentions - search for the creator's other content
   - Check if the video was reposted to YouTube or Instagram with more details

=== DO NOT MAKE UP INFORMATION ===
If you genuinely cannot find any information about this specific video after searching, clearly indicate this and ask the user for more details. Do not invent a recipe.
`;
  }
  
  if (linkInfo.platform === 'instagram') {
    return `
[SOCIAL MEDIA VIDEO ANALYSIS - INSTAGRAM]

The user has shared an Instagram post/reel link.

CLEANED URL: ${linkInfo.cleanUrl}
${linkInfo.username ? `CREATOR: @${linkInfo.username}` : ''}
${linkInfo.videoId ? `POST ID: ${linkInfo.videoId}` : ''}

=== SEARCH STRATEGY ===
1. Search for the Instagram post directly
2. Look for recipe details in captions or comments
3. Check if the creator has a linked blog or recipe website

${linkInfo.searchHints.map((hint, i) => `Search Query ${i + 1}: "${hint}"`).join('\n')}
`;
  }
  
  if (linkInfo.platform === 'youtube') {
    return `
[SOCIAL MEDIA VIDEO ANALYSIS - YOUTUBE]

The user has shared a YouTube video link.

CLEANED URL: ${linkInfo.cleanUrl}
${linkInfo.username ? `CHANNEL: @${linkInfo.username}` : ''}
${linkInfo.videoId ? `VIDEO ID: ${linkInfo.videoId}` : ''}

=== SEARCH STRATEGY ===
1. YouTube videos often have detailed descriptions with ingredient lists
2. Check video comments for "recipe" or "ingredients"
3. Many cocktail YouTubers post recipes on their websites

${linkInfo.searchHints.map((hint, i) => `Search Query ${i + 1}: "${hint}"`).join('\n')}
`;
  }
  
  return `
[URL ANALYSIS]
The user provided a link: ${linkInfo.cleanUrl}
Search for this URL to find any cocktail recipe content associated with it.
`;
}
