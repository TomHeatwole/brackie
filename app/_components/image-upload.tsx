"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

interface ImageUploadProps {
  name: string;
  label: string;
  initialValue?: string | null;
  error?: string;
  previewShape?: "circle" | "rounded";
  storagePath: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-lg";
  const fallbackEmoji = previewShape === "circle" ? "👤" : "🏆";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const fileName = `${storagePath}/${crypto.randomUUID()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) {
        setUploadError("Upload failed. Please try again.");
        console.error("Storage upload error:", storageError);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      setUrl(publicUrlData.publicUrl);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setUrl("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 ${shapeClass} shrink-0 overflow-hidden flex items-center justify-center bg-card border border-card-border`}
        >
          {url ? (
            <img
              src={url}
              alt="Preview"
              className={`w-12 h-12 ${shapeClass} object-cover`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-muted text-xl">{fallbackEmoji}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-outline text-xs px-3 py-1.5"
            >
              {uploading ? "Uploading…" : url ? "Change" : "Upload"}
            </button>
            {url && !uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-muted hover:text-stone-300 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">JPG, PNG, WebP, or GIF. 5 MB max.</p>
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
