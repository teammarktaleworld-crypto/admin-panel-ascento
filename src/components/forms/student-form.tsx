"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Student } from "@/types/api";

const schema = z.object({
  fullName: z.string().min(2),
  dob: z.string().min(1),
  age: z.number().min(1),
  gender: z.string().min(1),
  parentName: z.string().min(2),
  parentPhone: z.string().min(8),
  parentEmail: z.string().email(),
  domainId: z.string().min(1),
  password: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  address: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  bloodGroup: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

type StudentFormProps = {
  initial?: Partial<Student>;
  onSubmit: (payload: FormValues) => Promise<void>;
};

export function StudentForm({ initial, onSubmit }: StudentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initial?.fullName ?? "",
      dob: initial?.dob?.slice(0, 10) ?? "",
      age: initial?.age ?? 12,
      gender: initial?.gender ?? "male",
      parentName: initial?.parentName ?? "",
      parentPhone: initial?.parentPhone ?? "",
      parentEmail: initial?.parentEmail ?? "",
      domainId: initial?.domainId ?? "",
      password: "Student@123",
      status: initial?.status ?? "active",
      address: initial?.address ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      bloodGroup: initial?.bloodGroup ?? "O+",
    },
  });

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      {[
        ["fullName", "Student Name", "text"],
        ["dob", "DOB", "date"],
        ["gender", "Gender", "text"],
        ["parentName", "Parent Name", "text"],
        ["parentPhone", "Parent Phone", "text"],
        ["parentEmail", "Parent Email", "email"],
        ["domainId", "Domain ID", "text"],
        ["password", "Password", "text"],
        ["address", "Address", "text"],
        ["city", "City", "text"],
        ["state", "State", "text"],
        ["bloodGroup", "Blood Group", "text"],
      ].map(([name, label, type]) => (
        <div key={name}>
          <p className="mb-1 text-xs text-zinc-500">{label}</p>
          <Input type={type} {...form.register(name as keyof FormValues)} />
        </div>
      ))}

      <div>
        <p className="mb-1 text-xs text-zinc-500">Age</p>
        <Input type="number" {...form.register("age", { valueAsNumber: true })} />
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
          {form.formState.isSubmitting ? "Saving..." : "Save Student"}
        </Button>
      </div>
    </form>
  );
}
