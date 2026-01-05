"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

type Tier = "free" | "plus";

const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB

type EditPost = {
  id: string;
  body: string;
  topic: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  expires_at: string | null;
};

function expiresAtToUi(expires_at: string | null): "none" | "7" | "14" | "30" {
  if (!expires_at) return "none";

  const now = new Date();
  const exp = new Date(expires_at);

  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return "7";
  if (diffDays <= 14) return "14";
  return "30";
}

export default function WritePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ✅ reliable editId (from window.location.search)
  const [editId, setEditId] = useState<string | null>(null);

  // Tier (UI only; server still enforces)
  const [tier, setTier] = useState<Tier>("free");
  const [tierLoading, setTierLoading] = useState(true);
  const maxChars = tier === "plus" ? 2000 : 600;

  // Form state
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [expiresAt, setExpiresAt] = useState<"none" | "7" | "14" | "30">("none");

  // Media state (one media per post)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Existing media when editing
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
  const [existingMediaType, setExistingMediaType] = useState<"image" | "video" | null>(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = maxChars - body.length; // can go negative

  const didLoadEditRef = useRef<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const attachedType: "image" | "video" | null =
    (videoFile ? "video" : imageFile ? "image" : null) || existingMediaType;

  // ✅ read editId from URL once on mount
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("edit");
    setEditId(id);
  }, []);

  // Load tier once
  useEffect(() => {
    let cancelled = false;

    async function loadTier() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setTier(data?.subscription_tier === "plus" ? "plus" : "free");
      } catch {
        if (!cancelled) setTier("free");
      } finally {
        if (!cancelled) setTierLoading(false);
      }
    }

    loadTier();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Load post when editing
  useEffect(() => {
    if (!editId) return;
    if (didLoadEditRef.current === editId) return;
    didLoadEditRef.current = editId;

    let cancelled = false;

    async function loadEditPost() {
      setError(null);
      setLoadingEdit(true);

      try {
        const res = await fetch(`/api/posts/${editId}`, { cache: "no-store" });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error ?? "Could not load this post for editing.");
          setLoadingEdit(false);
          return;
        }

        const p: EditPost = data.post;

        setBody(p.body ?? "");
        setTopic(p.topic ?? "");
        setExpiresAt(expiresAtToUi(p.expires_at));

        setExistingMediaUrl(p.media_url);
        setExistingMediaType(p.media_type);

        // clear local picked files/previews
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setImageFile(null);
        setImagePreview(null);
        setVideoFile(null);
        setVideoPreview(null);

        setLoadingEdit(false);
      } catch {
        if (!cancelled) {
          setError("Network error loading edit post.");
          setLoadingEdit(false);
        }
      }
    }

    loadEditPost();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function resetLocalMediaPreviews() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
  }

  function clearAllMedia() {
    setExistingMediaUrl(null);
    setExistingMediaType(null);
    resetLocalMediaPreviews();
  }

  function onPickImage(file: File | null) {
    setError(null);

    if (!file) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > IMAGE_MAX_BYTES) {
      setError("That image is too large. Please use one under 10MB.");
      return;
    }

    // one-media rule: clear video + existing
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setExistingMediaUrl(null);
    setExistingMediaType(null);

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function onPickVideo(file: File | null) {
    setError(null);

    if (!file) {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoFile(null);
      setVideoPreview(null);
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }

    if (file.size > VIDEO_MAX_BYTES) {
      setError("That video is too large. Please use one under 25MB.");
      return;
    }

    // one-media rule: clear image + existing
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setExistingMediaUrl(null);
    setExistingMediaType(null);

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function onPickMedia(file: File | null) {
    setError(null);
    if (!file) return;

    if (file.type.startsWith("image/")) {
      onPickImage(file);
      return;
    }

    if (file.type.startsWith("video/")) {
      onPickVideo(file);
      return;
    }

    setError("Please choose an image or video file.");
  }

  async function uploadImageIfAny(): Promise<string | null> {
    if (!imageFile) return null;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("You must be signed in to upload.");

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${uuidv4()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("post-media")
      .upload(path, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadVideoIfAny(): Promise<string | null> {
    if (!videoFile) return null;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("You must be signed in to upload.");

    const ext = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${user.id}/${uuidv4()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("post-videos")
      .upload(path, videoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: videoFile.type,
      });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data } = supabase.storage.from("post-videos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit() {
    setError(null);

    const text = body.trim();
    const cleanTopic = topic.trim();

    if (loading || loadingEdit) return;

    if (text.length < 1) {
      setError("Write something small. One line is enough.");
      return;
    }

    if (text.length > maxChars) {
      setError(`Please shorten this to ${maxChars} characters or less.`);
      return;
    }

    if (cleanTopic.length > 32) {
      setError("Topic must be 32 characters or less.");
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrl = await uploadImageIfAny();
      const uploadedVideoUrl = await uploadVideoIfAny();

      const finalMediaUrl =
        uploadedVideoUrl ||
        uploadedImageUrl ||
        (existingMediaUrl && existingMediaType ? existingMediaUrl : null);

      const finalMediaType =
        uploadedVideoUrl
          ? "video"
          : uploadedImageUrl
          ? "image"
          : existingMediaUrl
          ? existingMediaType
          : null;

      const isEdit = !!editId;
      const endpoint = isEdit ? `/api/posts/${editId}` : "/api/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          topic: cleanTopic || null,
          expiresAt,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      // reset state
      setBody("");
      setTopic("");
      setExpiresAt("none");
      clearAllMedia();

      router.push("/read");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Network error. Please try again.");
      setLoading(false);
    }
  }

  const pageTitle = editId ? "Edit" : "Write";
  const primaryLabel = editId ? "Save changes" : "Publish";
  const hasLocalPreview = !!imagePreview || !!videoPreview;
  const hasExisting = !!existingMediaUrl && !!existingMediaType;
  const hasAnyMedia = hasLocalPreview || hasExisting;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <AppNav />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{pageTitle}</h1>
          <Link href="/start" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back
          </Link>
        </header>

        <p className="mt-4 text-sm text-zinc-600">
          You don’t need to be polished.
          <span className="ml-2 inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
            {tierLoading ? "…" : tier === "plus" ? "Plus" : "Free"}
          </span>
        </p>

        {loadingEdit && editId && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Loading your post…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write here…"
            className="min-h-[160px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-zinc-400"
          />

          {/* Calm add row INSIDE the card */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="text-xs text-zinc-600">
              {hasAnyMedia ? (
                <>
                  Attached:{" "}
                  <span className="font-medium text-zinc-800">
                    {attachedType ?? "media"}
                  </span>
                </>
              ) : (
                <>Add a photo or video (optional)</>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasAnyMedia && (
                <button
                  type="button"
                  onClick={clearAllMedia}
                  className="rounded-lg px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Remove
                </button>
              )}

              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-lg text-zinc-900 hover:bg-zinc-50"
                aria-label="Add media"
                title="Add media"
              >
                +
              </button>

              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onPickMedia(file);
                  // allow selecting same file again later
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          {/* Existing media preview (edit mode) */}
          {editId && existingMediaUrl && existingMediaType && !hasLocalPreview && (
            <div className="mt-4">
              <div className="text-sm text-zinc-700">Current</div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                {existingMediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={existingMediaUrl} alt="Current media" className="h-auto w-full" />
                ) : (
                  <video
                    src={existingMediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full"
                    autoPlay={false}
                    loop={false}
                  />
                )}
              </div>
            </div>
          )}

          {/* Local preview (new upload) */}
          {imagePreview && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="h-auto w-full" />
            </div>
          )}

          {videoPreview && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <video src={videoPreview} controls playsInline preload="metadata" className="w-full" />
            </div>
          )}

          {/* Helper text based on type */}
          {attachedType === "image" && (
            <div className="mt-2 text-xs text-zinc-500">Under 10MB. No edits. No filters.</div>
          )}
          {attachedType === "video" && (
            <div className="mt-2 text-xs text-zinc-500">No autoplay. No looping. Under 25MB.</div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic (optional)"
                className="w-44 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />

              <select
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value as "none" | "7" | "14" | "30")}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                <option value="none">No expiry</option>
                <option value="7">Expires in 7 days</option>
                <option value="14">Expires in 14 days</option>
                <option value="30">Expires in 30 days</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className={["text-xs", remaining < 0 ? "text-red-600" : "text-zinc-500"].join(" ")}>
                {remaining} left
              </div>

              <button
                onClick={submit}
                disabled={loading || loadingEdit}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? (editId ? "Saving…" : "Publishing…") : primaryLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-zinc-500">No likes. No comments. No direct messages.</div>
      </div>
    </main>
  );
}
