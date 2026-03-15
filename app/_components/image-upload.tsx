"use client";

import { useState, useRef, useCallback } from "react";
import { uploadImage } from "@/app/_actions/upload-image";

interface ImageUploadProps {
  name: string;
  label: string;
  initialValue?: string | null;
  error?: string;
  previewShape?: "circle" | "rounded";
  storagePath: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUpload({
  name,
  label,
  initialValue,
  error,
  previewShape = "circle",
  storagePath,
}: ImageUploadProps) {
  const [url, setUrl] = useState(initialValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-lg";
  const fallbackEmoji = previewShape === "circle" ? "👤" : "🏆";

  const processFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Please upload a JPEG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Image must be smaller than 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("storagePath", storagePath);

        const result = await uploadImage(formData);

        if (result.error) {
          setUploadError(result.error);
          return;
        }
        if (result.url) {
          setUrl(result.url);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Body exceeded") || msg.includes("too large") || msg.includes("413")) {
          setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please use a smaller image.`);
        } else {
          setUploadError("Upload failed. Please try again.");
        }
      } finally {
        setUploading(false);
      }
    },
    [storagePath]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setUrl("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (url) {
    return (
      <div>
        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <input type="hidden" name={name} value={url} />
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${shapeClass} shrink-0 overflow-hidden bg-card border border-card-border`}
          >
            <img
              src={url}
              alt="Preview"
              className={`w-12 h-12 ${shapeClass} object-cover`}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-outline text-xs px-3 py-1.5"
            >
              {uploading ? "Uploading…" : "Change"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-muted hover:text-stone-300 transition-colors"
            >
              Remove
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {(error || uploadError) && (
          <p className="mt-1.5 text-xs text-red-400">{error || uploadError}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={url} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full flex items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 cursor-pointer transition-colors ${
          dragging
            ? "border-accent bg-accent/10"
            : "border-card-border hover:border-stone-500 hover:bg-white/[0.02]"
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div
          className={`w-10 h-10 ${shapeClass} shrink-0 flex items-center justify-center bg-card border border-card-border`}
        >
          <span className="text-muted text-lg">{fallbackEmoji}</span>
        </div>
        <div className="text-center">
          <p className="text-sm text-stone-300">
            {uploading ? "Uploading…" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-muted mt-0.5">JPG, PNG, WebP, or GIF. 5 MB max.</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      {(error || uploadError) && (
        <p className="mt-1.5 text-xs text-red-400">{error || uploadError}</p>
      )}
    </div>
  );
}
