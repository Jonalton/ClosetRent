import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { listingsApi } from '../api/listings'
import axios from 'axios'

interface UploadedFile {
  file: File
  preview: string
  publicUrl: string | null
  progress: number
  error: string | null
}

interface Props {
  onUrlsChange: (urls: string[]) => void
  maxFiles?: number
}

export default function ImageUploader({ onUrlsChange, maxFiles = 5 }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      const { signed_url, public_url } = await listingsApi.getSignedUploadUrl(
        uploadedFile.file.name,
        uploadedFile.file.type
      )

      await axios.put(signed_url, uploadedFile.file, {
        headers: { 'Content-Type': uploadedFile.file.type },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round(((progressEvent.loaded ?? 0) * 100) / (progressEvent.total ?? 1))
          setFiles((prev) =>
            prev.map((f) =>
              f.preview === uploadedFile.preview ? { ...f, progress: pct } : f
            )
          )
        },
      })

      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.preview === uploadedFile.preview ? { ...f, publicUrl: public_url, progress: 100 } : f
        )
        onUrlsChange(updated.filter((f) => f.publicUrl).map((f) => f.publicUrl!))
        return updated
      })
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.preview === uploadedFile.preview ? { ...f, error: 'Upload failed' } : f
        )
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        publicUrl: null,
        progress: 0,
        error: null,
      }))
      setFiles((prev) => {
        const combined = [...prev, ...newFiles].slice(0, maxFiles)
        return combined
      })
      newFiles.forEach(uploadFile)
    },
    [maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles,
  })

  const removeFile = (preview: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.preview !== preview)
      onUrlsChange(updated.filter((f) => f.publicUrl).map((f) => f.publicUrl!))
      return updated
    })
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 font-medium">
            {isDragActive ? 'Drop images here' : 'Drag photos here or click to upload'}
          </p>
          <p className="text-sm text-gray-400">JPG, PNG, WebP up to 10MB — max {maxFiles} photos</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {files.map((f) => (
            <div key={f.preview} className="relative rounded-lg overflow-hidden aspect-square bg-gray-100">
              <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
              {f.progress < 100 && !f.error && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span className="absolute text-white text-xs font-bold">{f.progress}%</span>
                </div>
              )}
              {f.error && (
                <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                  <span className="text-white text-xs text-center px-1">{f.error}</span>
                </div>
              )}
              <button
                onClick={() => removeFile(f.preview)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
