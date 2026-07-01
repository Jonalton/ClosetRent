import React, { useCallback, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { listingsApi } from '../api/listings'
import axios from 'axios'
import heic2any from 'heic2any'

interface LocalFile {
  file: File        // converted JPEG blob
  preview: string   // data URL (JPEG)
}

export interface ImageUploaderHandle {
  uploadAll: () => Promise<string[]>
}

interface Props {
  maxFiles?: number
  onFileCountChange?: (count: number) => void
}

const ImageUploader = forwardRef<ImageUploaderHandle, Props>(function ImageUploader(
  { maxFiles = 5, onFileCountChange },
  ref
) {
  const [files, setFiles] = useState<LocalFile[]>([])
  const [converting, setConverting] = useState(0)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    onFileCountChange?.(files.length)
  }, [files.length, onFileCountChange])

  useImperativeHandle(ref, () => ({
    uploadAll: async () => {
      if (files.length === 0) throw new Error('No files selected')
      const urls: string[] = []
      for (const f of files) {
        try {
          const { signed_url, public_url } = await listingsApi.getSignedUploadUrl(
            `listings/${Date.now()}_${f.file.name}`,
            f.file.type
          )
          await axios.put(signed_url, f.file, {
            headers: { 'Content-Type': f.file.type },
            onUploadProgress: (e) => {
              const pct = Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1))
              setProgress((prev) => ({ ...prev, [f.preview]: pct }))
            },
          })
          urls.push(public_url)
        } catch {
          setErrors((prev) => ({ ...prev, [f.preview]: 'Upload failed' }))
          throw new Error(`Failed to upload ${f.file.name}`)
        }
      }
      return urls
    },
  }), [files])

  const convertToJpeg = async (file: File): Promise<{ file: File; preview: string }> => {
    let blob: Blob = file

    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

    if (isHeic) {
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
      blob = Array.isArray(result) ? result[0] : result
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(blob)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        canvas.toBlob(
          (out) => {
            if (!out) return reject(new Error('Canvas conversion failed'))
            const jpegFile = new File([out], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            resolve({ file: jpegFile, preview: canvas.toDataURL('image/jpeg', 0.85) })
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image')) }
      img.src = objectUrl
    })
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setConverting((n) => n + acceptedFiles.length)
      acceptedFiles.forEach(async (file) => {
        try {
          const converted = await convertToJpeg(file)
          setFiles((prev) => {
            if (prev.length >= maxFiles) return prev
            return [...prev, converted]
          })
        } catch {
          console.error('Could not preview', file.name)
        } finally {
          setConverting((n) => n - 1)
        }
      })
    },
    [maxFiles]
  )

  const removeFile = (preview: string) => {
    setFiles((prev) => prev.filter((f) => f.preview !== preview))
    setProgress((prev) => { const next = { ...prev }; delete next[preview]; return next })
    setErrors((prev) => { const next = { ...prev }; delete next[preview]; return next })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif'] },
    maxFiles,
  })

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
            {isDragActive ? 'Drop images here' : 'Drag photos here or click to select'}
          </p>
          <p className="text-sm text-gray-400">JPG, PNG, WebP, HEIC — max {maxFiles} photos. Uploaded when you publish.</p>
        </div>
      </div>

      {(files.length > 0 || converting > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: converting }).map((_, i) => (
            <div key={`loading-${i}`} className="relative rounded-lg overflow-hidden aspect-square bg-gray-100 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            </div>
          ))}
          {files.map((f) => (
            <div key={f.preview} className="relative rounded-lg overflow-hidden aspect-square bg-gray-100">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              {progress[f.preview] !== undefined && progress[f.preview] < 100 && !errors[f.preview] && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span className="absolute text-white text-xs font-bold">{progress[f.preview]}%</span>
                </div>
              )}
              {errors[f.preview] && (
                <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                  <span className="text-white text-xs text-center px-1">{errors[f.preview]}</span>
                </div>
              )}
              <button
                type="button"
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
})

export default ImageUploader
