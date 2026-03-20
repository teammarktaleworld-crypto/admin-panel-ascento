"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type ModulePlaceholderProps = {
  title: string;
  subtitle: string;
  fetcher: (params?: Record<string, string>) => Promise<unknown>;
  creator?: (payload: Record<string, unknown>) => Promise<unknown>;
};

export function ModulePlaceholder({ title, subtitle, fetcher, creator }: ModulePlaceholderProps) {
  const [jsonPayload, setJsonPayload] = useState("{\n  \"status\": \"active\"\n}");
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: [title.toLowerCase(), "list"],
    queryFn: () => fetcher(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!creator) {
        throw new Error("no_creator");
      }
      return creator(JSON.parse(jsonPayload) as Record<string, unknown>);
    },
    onSuccess: async () => {
      toast.success(`${title} created`);
      await queryClient.invalidateQueries({ queryKey: [title.toLowerCase(), "list"] });
    },
    onError: () => toast.error(`Failed to create ${title.toLowerCase()}`),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-medium">Live API Snapshot</h2>
        {listQuery.isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : (
          <pre className="max-h-72 overflow-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
            {JSON.stringify(listQuery.data, null, 2)}
          </pre>
        )}
      </Card>

      {creator ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Quick Create</h2>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus size={14} className="mr-1" />
              Submit
            </Button>
          </div>
          <Textarea value={jsonPayload} onChange={(event) => setJsonPayload(event.target.value)} rows={8} />
          <Input
            readOnly
            value="Edit JSON payload based on backend shape from test.json"
            className="text-xs text-zinc-500"
          />
        </Card>
      ) : null}
    </div>
  );
}
