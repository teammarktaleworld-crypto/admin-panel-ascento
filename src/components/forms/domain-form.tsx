"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Domain } from "@/types/api";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

type DomainFormProps = {
  initial?: Partial<Domain>;
  onSubmit: (payload: FormValues) => Promise<void>;
};

export function DomainForm({ initial, onSubmit }: DomainFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      code: initial?.code ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? "active",
    },
  });

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <p className="mb-1 text-xs text-zinc-500">Name</p>
        <Input {...form.register("name")} />
      </div>
      <div>
        <p className="mb-1 text-xs text-zinc-500">Code</p>
        <Input {...form.register("code")} />
      </div>
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs text-zinc-500">Description</p>
        <Textarea {...form.register("description")} rows={4} />
      </div>
      <div>
        <p className="mb-1 text-xs text-zinc-500">Status</p>
        <Select {...form.register("status")}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Domain"}
        </Button>
      </div>
    </form>
  );
}
