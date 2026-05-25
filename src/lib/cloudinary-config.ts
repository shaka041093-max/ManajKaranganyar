/**
 * @fileOverview Konfigurasi Cloudinary Desa Digital.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: "dy9dw8jyu",
  uploadPreset: "desa_digital_preset", 
  apiKey: "884953774946978",
  baseUrl: "https://api.cloudinary.com/v1_1/dy9dw8jyu/image/upload"
};

/**
 * Utilitas untuk mengoptimalkan URL Cloudinary secara otomatis.
 */
export const getOptimizedCloudinaryUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};
