"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/app/modal";

type JsonCrudModuleProps = {
  title: string;
  subtitle: string;
  queryKey: string;
  fetchList: (params?: Record<string, string>) => Promise<unknown>;
  createItem?: (payload: Record<string, unknown>) => Promise<unknown>;
  updateItem?: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  deleteItem?: (id: string) => Promise<unknown>;
  defaultCreatePayload?: Record<string, unknown>;
  defaultUpdatePayload?: Record<string, unknown>;
  defaultListParams?: Record<string, string>;
};

function getId(row: Record<string, unknown>): string {
  return String(row._id ?? row.id ?? "");
}

export function JsonCrudModule({
  title,
  subtitle,
  queryKey,
  fetchList,
  createItem,
  updateItem,
  deleteItem,
  defaultCreatePayload,
  defaultUpdatePayload,
  defaultListParams,
}: JsonCrudModuleProps) {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const [paramsRaw, setParamsRaw] = useState(JSON.stringify(defaultListParams || {}, null, 2));
  const [createRaw, setCreateRaw] = useState(JSON.stringify(defaultCreatePayload || {}, null, 2));
  const [updateRaw, setUpdateRaw] = useState(JSON.stringify(defaultUpdatePayload || {}, null, 2));

  const paramsObj = useMemo(() => {
    try {
      return JSON.parse(paramsRaw) as Record<string, string>;
    } catch {
      return {};
    }
  }, [paramsRaw]);

  const listQuery = useQuery({
    queryKey: [queryKey, paramsObj],
    queryFn: () => fetchList(paramsObj),
  });

  const rows = useMemo(() => {
    const data = listQuery.data;
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }
    if (data && typeof data === "object") {
      const maybe = data as { items?: unknown[]; data?: unknown[] };
      if (Array.isArray(maybe.items)) {
        return maybe.items as Record<string, unknown>[];
      }
      if (Array.isArray(maybe.data)) {
        return maybe.data as Record<string, unknown>[];
      }
    }
    return [];
  }, [listQuery.data]);

  const columns = useMemo(() => {
    const base = rows[0] ? Object.keys(rows[0]).slice(0, 6) : ["_id"];
    return base;
  }, [rows]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createItem) {
        return null;
      }
      return createItem(JSON.parse(createRaw) as Record<string, unknown>);
    },
    onSuccess: async () => {
      toast.success(`${title} created`);
      setOpenCreate(false);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Create failed for ${title}`),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!updateItem || !selectedId) {
        return null;
      }
      return updateItem(selectedId, JSON.parse(updateRaw) as Record<string, unknown>);
    },
    onSuccess: async () => {
      toast.success(`${title} updated`);
      setOpenEdit(false);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Update failed for ${title}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!deleteItem) {
        return null;
      }
      return deleteItem(id);
    },
    onSuccess: async () => {
      toast.success(`${title} deleted`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Delete failed for ${title}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => listQuery.refetch()}>
            <RefreshCcw size={14} className="mr-1" />
            Refresh
          </Button>
          {createItem ? (
            <Button onClick={() => setOpenCreate(true)}>
              <Plus size={14} className="mr-1" />
              Create
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">List Query Params (JSON)</p>
        <Textarea rows={4} value={paramsRaw} onChange={(event) => setParamsRaw(event.target.value)} />
      </Card>

      <Card>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-2 py-2 font-medium text-zinc-500">
                    {column}
                  </th>
                ))}
                {(updateItem || deleteItem) && <th className="px-2 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = getId(row);
                return (
                  <tr key={id || index} className="border-b border-zinc-100 dark:border-zinc-800/70">
                    {columns.map((column) => (
                      <td key={column} className="px-2 py-2">
                        {String(row[column] ?? "-")}
                      </td>
                    ))}
                    {(updateItem || deleteItem) && (
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          {updateItem ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRow(row);
                                setSelectedId(id);
                                setUpdateRaw(
                                  JSON.stringify(defaultUpdatePayload || { ...row }, null, 2),
                                );
                                setOpenEdit(true);
                              }}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {deleteItem ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (id) {
                                  deleteMutation.mutate(id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={`Create ${title}`}>
        <div className="space-y-3">
          <Textarea rows={14} value={createRaw} onChange={(event) => setCreateRaw(event.target.value)} />
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </Modal>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={`Update ${title}: ${selectedId}`}>
        <div className="space-y-3">
          <Input readOnly value={selectedId} />
          <Textarea rows={14} value={updateRaw} onChange={(event) => setUpdateRaw(event.target.value)} />
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Updating..." : "Update"}
          </Button>
          <pre className="max-h-40 overflow-auto rounded-md bg-zinc-900 p-2 text-xs text-zinc-100">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </div>
      </Modal>
    </div>
  );
}
