"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Teacher } from "@/types/api";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  domainId: z.string().min(1),
  status: z.enum(["active", "inactive"]),
  address: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  dateOfBirth: z.string().min(1),
  gender: z.string().min(1),
  qualification: z.string().min(2),
  experienceYears: z.number().min(0),
  joiningDate: z.string().min(1),
  profilePhoto: z.string().url(),
});

type FormValues = z.infer<typeof schema>;

type TeacherFormProps = {
  initial?: Partial<Teacher>;
  onSubmit: (payload: FormValues) => Promise<void>;
};

export function TeacherForm({ initial, onSubmit }: TeacherFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      domainId: initial?.domainId ?? "",
      status: initial?.status ?? "active",
      address: initial?.address ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      country: initial?.country ?? "India",
      dateOfBirth: initial?.dateOfBirth?.slice(0, 10) ?? "",
      gender: initial?.gender ?? "male",
      qualification: initial?.qualification ?? "",
      experienceYears: initial?.experienceYears ?? 0,
      joiningDate: initial?.joiningDate?.slice(0, 10) ?? "",
      profilePhoto: initial?.profilePhoto ?? "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    },
  });

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      {[
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone", "text"],
        ["domainId", "Domain ID", "text"],
        ["address", "Address", "text"],
        ["city", "City", "text"],
        ["state", "State", "text"],
        ["country", "Country", "text"],
        ["dateOfBirth", "Date of Birth", "date"],
        ["gender", "Gender", "text"],
        ["qualification", "Qualification", "text"],
        ["joiningDate", "Joining Date", "date"],
        ["profilePhoto", "Profile Photo URL", "text"],
      ].map(([name, label, type]) => (
        <div key={name}>
          <p className="mb-1 text-xs text-zinc-500">{label}</p>
          <Input type={type} {...form.register(name as keyof FormValues)} />
        </div>
      ))}

      <div>
        <p className="mb-1 text-xs text-zinc-500">Experience</p>
        <Input type="number" {...form.register("experienceYears", { valueAsNumber: true })} />
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
          {form.formState.isSubmitting ? "Saving..." : "Save Teacher"}
        </Button>
      </div>
    </form>
  );
}
