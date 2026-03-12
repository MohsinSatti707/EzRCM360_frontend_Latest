/**
 * useCrudPage: Centralizes CRUD page logic (Single Responsibility).
 * Encapsulates: pagination, modal state, form state, create/edit/delete handlers.
 */

import { useCallback, useState } from "react";
import { usePaginatedList } from "./usePaginatedList";
import type { PaginatedList } from "@/lib/types";

export interface CrudApi<TItem, TForm, TCreate = TForm, TUpdate = TForm> {
  getList: (params?: {
    pageNumber?: number;
    pageSize?: number;
    [key: string]: unknown;
  }) => Promise<PaginatedList<TItem>>;
  create: (body: TCreate) => Promise<string | void>;
  update: (id: string, body: TUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export interface UseCrudPageOptions<TItem, TForm, TCreate = TForm, TUpdate = TForm> {
  api: CrudApi<TItem, TForm, TCreate, TUpdate>;
  pageNumber: number;
  pageSize?: number;
  defaultForm: TForm;
  /** Map item to form for edit mode */
  toForm: (item: TItem) => TForm;
  /** Optional extra fetch params */
  fetchParams?: Record<string, unknown>;
  onPageChange: (page: number) => void;
}

export interface UseCrudPageResult<TItem, TForm> {
  data: PaginatedList<TItem> | null;
  error: string | null;
  loading: boolean;
  modalOpen: boolean;
  editId: string | null;
  form: TForm;
  setForm: React.Dispatch<React.SetStateAction<TForm>>;
  submitLoading: boolean;
  formError: string | null;
  deleteId: string | null;
  deleteLoading: boolean;
  overlayLoading: boolean;
  openCreate: () => void;
  openEdit: (item: TItem) => void;
  closeModal: () => void;
  handleSubmit: (validate?: (f: TForm) => string | null) => Promise<void>;
  setDeleteId: (id: string | null) => void;
  handleDelete: () => Promise<void>;
  reload: () => void;
}

export function useCrudPage<TItem extends { id: string }, TForm, TCreate = TForm, TUpdate = TForm>({
  api,
  pageNumber,
  pageSize = 10,
  defaultForm,
  toForm,
  fetchParams,
  onPageChange,
}: UseCrudPageOptions<TItem, TForm, TCreate, TUpdate>): UseCrudPageResult<TItem, TForm> {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TForm>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const fetchFn = useCallback(
    (params: { pageNumber: number; pageSize: number }) =>
      api.getList({ ...params, ...fetchParams } as { pageNumber: number; pageSize: number }),
    [api, fetchParams]
  );

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber,
    pageSize,
    fetch: fetchFn,
  });

  const openCreate = useCallback(() => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  }, [defaultForm]);

  const openEdit = useCallback(
    (item: TItem) => {
      setEditId(item.id);
      setForm(toForm(item));
      setFormError(null);
      setModalOpen(true);
    },
    [toForm]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (validate?: (f: TForm) => string | null) => {
      setFormError(null);
      const err = validate?.(form);
      if (err) {
        setFormError(err);
        return;
      }
      setSubmitLoading(true);
      setOverlayLoading(true);
      try {
        if (editId) {
          await api.update(editId, form as unknown as TUpdate);
        } else {
          await api.create(form as unknown as TCreate);
        }
        setModalOpen(false);
        setSubmitLoading(false);
        await reload();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        setFormError(msg);
        setSubmitLoading(false);
        throw err;
      } finally {
        setOverlayLoading(false);
      }
    },
    [api, editId, form, reload]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.delete(deleteId);
      setDeleteId(null);
      setDeleteLoading(false);
      await reload();
    } catch {
      setDeleteLoading(false);
      throw new Error("Delete failed.");
    } finally {
      setOverlayLoading(false);
    }
  }, [api, deleteId, reload]);

  return {
    data,
    error,
    loading,
    modalOpen,
    editId,
    form,
    setForm,
    submitLoading,
    formError,
    deleteId,
    deleteLoading,
    overlayLoading,
    openCreate,
    openEdit,
    closeModal,
    handleSubmit,
    setDeleteId,
    handleDelete,
    reload,
  };
}
