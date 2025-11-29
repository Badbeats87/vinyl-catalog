'use client';

import React, { useState, useRef } from 'react';

export interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  isMain?: boolean;
}

interface PhotoUploadProps {
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotosChange,
  maxPhotos = 5,
  maxSizeMB = 10,
}) => {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed';
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const addPhotos = (files: File[]) => {
    setError('');

    // Check total number of photos
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const newPhotos: UploadedPhoto[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const photo: UploadedPhoto = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: e.target?.result as string,
          isMain: photos.length + newPhotos.length === 0, // First photo is main
        };

        newPhotos.push(photo);

        if (newPhotos.length === files.filter(f => !validateFile(f)).length) {
          const updated = [...photos, ...newPhotos];
          setPhotos(updated);
          onPhotosChange(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      addPhotos(imageFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPhotos(files);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);

    // If removed photo was main, make next one main
    if (updated.length > 0) {
      const hadMain = photos.find(p => p.id === id)?.isMain;
      if (hadMain) {
        updated[0].isMain = true;
      }
    }

    setPhotos(updated);
    onPhotosChange(updated);
  };

  const setMainPhoto = (id: string) => {
    const updated = photos.map(p => ({
      ...p,
      isMain: p.id === id,
    }));
    setPhotos(updated);
    onPhotosChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          <div>
            <p className="text-sm font-medium text-gray-900">
              Drag and drop photos here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                click to select
              </button>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              PNG, JPG up to {maxSizeMB}MB • {maxPhotos - photos.length} remaining
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Uploaded Photos ({photos.length}/{maxPhotos})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                {/* Photo Preview */}
                <div
                  className={`relative h-32 rounded-lg overflow-hidden border-2 ${
                    photo.isMain ? 'border-green-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={photo.preview}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Main Badge */}
                  {photo.isMain && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      Main
                    </div>
                  )}

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {!photo.isMain && (
                      <button
                        type="button"
                        onClick={() => setMainPhoto(photo.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-semibold transition"
                        title="Set as main photo"
                      >
                        Set Main
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-xs font-semibold transition"
                      title="Remove photo"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* File Name */}
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {photo.file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
