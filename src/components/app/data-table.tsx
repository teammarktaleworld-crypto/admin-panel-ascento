"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type DataTableProps<T> = {
  title: string;
  data: T[];
  columns: Array<{ key: keyof T; label: string }>;
  searchKeys: Array<keyof T>;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
};

export function DataTable<T extends { _id?: string }>({
  title,
  data,
  columns,
  searchKeys,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => String(item[key] ?? "").toLowerCase().includes(lower)),
    );
  }, [data, searchKeys, search]);

  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = filtered.slice(start, start + perPage);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input className="pl-8" placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-2 py-2 font-medium text-zinc-500">
                  {column.label}
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={row._id ?? index} className="border-b border-zinc-100 dark:border-zinc-800/70">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-2 py-2">
                    {String(row[column.key] ?? "-")}
                  </td>
                ))}
                <td className="px-2 py-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </Button>
        <span className="text-xs text-zinc-500">
          {page}/{totalPages}
        </span>
        <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          Next
        </Button>
      </div>
    </Card>
  );
}
