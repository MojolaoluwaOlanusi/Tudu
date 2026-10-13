import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { Category, Priority, Status, TaskFilters } from '../types/task';

export type SortKey =
  | 'created_at'
  | 'updated_at'
  | 'due_date'
  | 'title'
  | 'priority'
  | 'assignee'
  | 'category';
export type SortOrder = 'asc' | 'desc';

interface FilterState {
  search: string;
  status?: Status;
  category?: Category;
  priority?: Priority;
  sort: SortKey;
  order: SortOrder;
  setSearch: (search: string) => void;
  setStatus: (status?: Status) => void;
  setCategory: (category?: Category) => void;
  setPriority: (priority?: Priority) => void;
  setSort: (sort: SortKey) => void;
  setOrder: (order: SortOrder) => void;
  clearFilters: () => void;
}

/**
 * Task filter state lives in Zustand (instead of component `useState`) so that
 * filters survive navigation, remounts and can be shared between components.
 */
export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      search: '',
      status: undefined,
      category: undefined,
      priority: undefined,
      sort: 'created_at',
      order: 'desc',
      setSearch: (search) => set({ search }),
      setStatus: (status) => set({ status }),
      setCategory: (category) => set({ category }),
      setPriority: (priority) => set({ priority }),
      setSort: (sort) => set({ sort }),
      setOrder: (order) => set({ order }),
      clearFilters: () =>
        set({
          search: '',
          status: undefined,
          category: undefined,
          priority: undefined,
          sort: 'created_at',
          order: 'desc',
        }),
    }),
    { name: 'task-filters' }
  )
);

export const selectFilters = (state: FilterState): TaskFilters => ({
  search: state.search || undefined,
  status: state.status,
  category: state.category,
  priority: state.priority,
  sort: state.sort,
  order: state.order,
});

export const selectHasActiveFilters = (state: FilterState): boolean =>
  Boolean(state.search || state.status || state.category || state.priority);

/** Stable (shallow-compared) filter object safe to use inside query keys. */
export const useTaskFilters = (): TaskFilters => useFilterStore(useShallow(selectFilters));

export const useHasActiveFilters = (): boolean => useFilterStore(selectHasActiveFilters);
