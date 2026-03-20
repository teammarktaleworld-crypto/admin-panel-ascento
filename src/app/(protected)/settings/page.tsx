"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bot, CheckCircle2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi } from "@/lib/api";
import { useProfile } from "@/hooks/use-auth";

const schema = z
  .object({
    currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "New and confirm password must match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function generateAiSettingsArt(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/png?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

export default function SettingsPage() {
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as { message?: string } | undefined;
      return payload?.message || error.message || fallback;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  };

  const [aiSeed, setAiSeed] = useState("admin-security-settings");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileQuery = useProfile();

  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success("Password changed successfully");
      setAiSeed(`password-updated-${Date.now()}`);
      form.reset();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Password update failed")),
  });

  const aiImage = useMemo(() => generateAiSettingsArt(aiSeed), [aiSeed]);

  const isLoading = profileQuery.isLoading;
  const profile = profileQuery.data;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-36" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Card className="overflow-hidden border-0 bg-linear-to-r from-cyan-600 via-sky-500 to-indigo-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/85">Admin Security Hub</p>
            <h1 className="text-3xl font-semibold">Settings</h1>
            <p className="text-sm text-white/90">Centered, secure, and AI-enhanced account controls for admin password safety.</p>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Sparkles size={14} />
              <span>AI generated security animation panel</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm animate-rise-in">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-300/40 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <img
                src={aiImage}
                alt="AI security visual"
                className="h-16 w-16 rounded-xl border border-white/60 bg-white/80 object-cover"
                onError={(event) => {
                  event.currentTarget.src = "https://api.dicebear.com/9.x/shapes/png?seed=settings-fallback";
                }}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">AI Security Pattern</p>
                <p className="text-xs text-white/85">Regenerates after successful password updates.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 animate-rise-in">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-sky-600" />
          <h2 className="text-lg font-semibold">Admin Profile</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Name</p>
            <p className="mt-1 font-medium">{profile?.name || "-"}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Email</p>
            <p className="mt-1 font-medium">{profile?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Role</p>
            <p className="mt-1 font-medium">{profile?.role || "admin"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle2 size={16} />
          <p className="text-sm">Status: {profile?.isActive ? "Active and protected" : "Inactive"}</p>
        </div>
      </Card>

      <Card className="space-y-4 animate-rise-in">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>
        <p className="text-sm text-zinc-500">Use a strong password and keep your admin account secure.</p>

        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            await mutation.mutateAsync({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            });
          })}
        >
          <div>
            <p className="mb-1 text-xs text-zinc-500">Current Password</p>
            <Input type="password" {...form.register("currentPassword")} />
            {form.formState.errors.currentPassword ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.currentPassword.message}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">New Password</p>
            <Input type="password" {...form.register("newPassword")} />
            {form.formState.errors.newPassword ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.newPassword.message}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Confirm Password</p>
            <Input type="password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : "Change Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiSeed(`manual-refresh-${Date.now()}`)}
            >
              <Bot size={14} className="mr-2" />
              Regenerate AI Visual
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
