/**
 * @fileOverview Konfigurasi Cloudinary Desa Digital.
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "dy9dw8jyu";
const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || "884953774946978";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "desa_digital_preset";

export const CLOUDINARY_CONFIG = {
  cloudName,
  uploadPreset,
  apiKey,
  baseUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
};


/**
 * Utilitas untuk mengoptimalkan URL Cloudinary secara otomatis.
 */
export const getOptimizedCloudinaryUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};
