"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authApi } from "@/lib/api";
import { clearSession, setSessionKey } from "@/lib/storage";
import type { LoginPayload } from "@/types/api";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: authApi.profile,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setSessionKey(data.sessionKey);
      toast.success("Logged in successfully");
    },
    onError: () => {
      toast.error("Invalid credentials");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      clearSession();
      await queryClient.clear();
      toast.success("Logged out");
    },
  });
}
