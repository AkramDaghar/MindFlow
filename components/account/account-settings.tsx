"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, ImagePlus, Loader2, Monitor, Moon, Sun, X } from "lucide-react";
import {
  updateAvatar,
  updateDisplayName,
  updateEmail,
  updatePassword,
} from "@/app/account/actions";
import { ImageCropper } from "@/components/dashboard/image-cropper";

type Props = {
  initialEmail: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  profilesTableMissing: boolean;
};

type Banner = { type: "ok" | "err"; text: string } | null;

function StatusBanner({ banner }: { banner: Banner }) {
  if (!banner) return null;
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-xs ${
        banner.type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {banner.text}
    </p>
  );
}

export function AccountSettings({
  initialEmail,
  initialDisplayName,
  initialAvatarUrl,
  profilesTableMissing,
}: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Profile state
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savedName, setSavedName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileBanner, setProfileBanner] = useState<Banner>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailBanner, setEmailBanner] = useState<Banner>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwBanner, setPwBanner] = useState<Banner>(null);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const initial = (savedName[0] ?? initialEmail[0] ?? "?").toUpperCase();

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileBanner(null);
    const res = await updateDisplayName(displayName);
    setProfileBusy(false);
    if (res.error) {
      setProfileBanner({ type: "err", text: res.error });
    } else {
      const nextName = res.displayName ?? displayName;
      setDisplayName(nextName);
      setSavedName(nextName);
      setProfileBanner({ type: "ok", text: res.message ?? "Saved." });
    }
  };

  const handleAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileBanner({ type: "err", text: "Please select an image file." });
      return;
    }
    setProfileBanner(null);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleConfirmAvatarCrop = async (dataUrl: string) => {
    const prev = avatarUrl;
    setAvatarUrl(dataUrl);
    setCropSrc(null);
    setProfileBusy(true);
    setProfileBanner(null);
    const res = await updateAvatar(dataUrl);
    setProfileBusy(false);
    if (res.error) {
      setAvatarUrl(prev);
      setProfileBanner({ type: "err", text: res.error });
    } else {
      setProfileBanner({ type: "ok", text: res.message ?? "Profile picture updated." });
    }
  };

  const handleRemoveAvatar = async () => {
    const prev = avatarUrl;
    setAvatarUrl(null);
    setProfileBusy(true);
    setProfileBanner(null);
    const res = await updateAvatar(null);
    setProfileBusy(false);
    if (res.error) {
      setAvatarUrl(prev);
      setProfileBanner({ type: "err", text: res.error });
    } else {
      setProfileBanner({ type: "ok", text: res.message ?? "Profile picture removed." });
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailBusy(true);
    setEmailBanner(null);
    const res = await updateEmail(newEmail);
    setEmailBusy(false);
    if (res.error) {
      setEmailBanner({ type: "err", text: res.error });
    } else {
      setNewEmail("");
      setEmailBanner({ type: "ok", text: res.message ?? "Verification sent." });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setPwBanner(null);
    const res = await updatePassword(currentPassword, newPassword, confirmPassword);
    setPwBusy(false);
    if (res.error) {
      setPwBanner({ type: "err", text: res.error });
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwBanner({ type: "ok", text: res.message ?? "Password updated." });
    }
  };

  const inputCls =
    "w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-700 dark:focus:border-neutral-500";

  const themeOptions = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      {profilesTableMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Database update needed for profile pictures</p>
          <p className="mt-1 text-xs opacity-90">
            Run the <code>profiles</code> table SQL from <code>supabase/schema.sql</code> in your Supabase Dashboard → SQL Editor to save profile pictures across devices.
          </p>
        </div>
      )}

      {/* 1. Profile (Picture & Display Name) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Update how your name and avatar appear on MindFlow.
        </p>

        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-gradient-to-br from-neutral-700 to-neutral-900 text-lg font-semibold text-white dark:border-neutral-700 dark:from-neutral-200 dark:to-neutral-400 dark:text-neutral-900">
              {avatarUrl ? (
                <img src={avatarUrl} alt={savedName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={profileBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <ImagePlus size={14} />
                {avatarUrl ? "Change picture" : "Upload picture"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={profileBusy}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <form onSubmit={(e) => void handleSaveName(e)} className="space-y-2">
            <label htmlFor="display-name" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Display name
            </label>
            <div className="flex gap-2">
              <input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder="Your name"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={profileBusy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {profileBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </form>

          <StatusBanner banner={profileBanner} />
        </div>
      </section>

      {/* 2. Appearance (Light / Dark / System) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Choose between Light, Dark, or your device&apos;s System theme.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map(({ key, label, icon: Icon }) => {
            const active = mounted && theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Email */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Email address</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Current email: <span className="font-medium text-neutral-800 dark:text-neutral-200">{initialEmail}</span>
        </p>

        <form onSubmit={(e) => void handleUpdateEmail(e)} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="new-email" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              New email address
            </label>
            <div className="flex gap-2">
              <input
                id="new-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new-email@example.com"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={emailBusy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {emailBusy && <Loader2 size={14} className="animate-spin" />}
                Send verification
              </button>
            </div>
          </div>
          <StatusBanner banner={emailBanner} />
        </form>
      </section>

      {/* 4. Password */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Password</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Confirm your current password before setting a new one.
        </p>

        <form onSubmit={(e) => void handleUpdatePassword(e)} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="current-password" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={inputCls}
              />
            </div>
          </div>

          <StatusBanner banner={pwBanner} />

          <div className="pt-1">
            <button
              type="submit"
              disabled={pwBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {pwBusy && <Loader2 size={14} className="animate-spin" />}
              Update password
            </button>
          </div>
        </form>
      </section>

      {/* Avatar crop modal */}
      {cropSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCropSrc(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Crop profile picture"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
              <h3 className="text-sm font-semibold">Crop profile picture</h3>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
            <ImageCropper
              src={cropSrc}
              variant="avatar"
              onCancel={() => setCropSrc(null)}
              onConfirm={handleConfirmAvatarCrop}
            />
          </div>
        </div>
      )}
    </div>
  );
}
