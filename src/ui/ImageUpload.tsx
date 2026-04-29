'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { useCallback } from 'react';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  buttonText?: string;
  maxFiles?: number;
}

export function ImageUpload({ 
  onUploadSuccess, 
  buttonText = "Ajouter un document",
  maxFiles = 1 
}: ImageUploadProps) {

  const handleUpload = useCallback((result: any) => {
    if (result.event === 'success') {
      onUploadSuccess(result.info.secure_url);
    }
  }, [onUploadSuccess]);

  // Utilisation stricte de ton preset défini dans le .env
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  return (
    <CldUploadWidget 
      uploadPreset={uploadPreset}
      options={{ maxFiles, sources: ['local', 'camera'] }}
      onSuccess={handleUpload}
    >
      {({ open }) => {
        return (
          <button
            type="button"
            onClick={() => open()}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium transition-colors flex items-center justify-center gap-2 w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {buttonText}
          </button>
        );
      }}
    </CldUploadWidget>
  );
}
