"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockKeyhole } from "lucide-react";

import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export function LoginView() {
  const router = useRouter();
  const login = useLogin();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@school.com",
      password: "admin@123",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await login.mutateAsync(values);
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-sm space-y-4 border-zinc-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 animate-rise-in">
        <div>
          <div className="mb-4 flex justify-center rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Image src="/logo.png" alt="Ascento Abacus" width={180} height={54} className="h-auto w-auto" priority />
          </div>
          <h1 className="text-center text-xl font-semibold">Admin Login</h1>
          <p className="mt-1 text-center text-xs text-zinc-500">Sign in to continue.</p>
        </div>

        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Email</p>
            <Input type="email" {...form.register("email")} className="text-sm" />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Password</p>
            <Input type="password" {...form.register("password")} className="text-sm" />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full text-sm" disabled={login.isPending}>
            <LockKeyhole size={14} className="mr-2" />
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
