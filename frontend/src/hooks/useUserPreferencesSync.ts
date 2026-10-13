import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { userPreferencesService, type UserPreferences } from '../services/userPreferencesService';
import { useAuthStore } from '../store/authStore';
import { useFilterStore, type SortKey, type SortOrder } from '../store/filterStore';
import { useSearchParams } from 'react-router-dom';

/**
 * Loads the user's saved sort preference on first mount and writes it back
 * whenever the store's sort or order changes.
 *
 * If the URL already carries ?sort= / ?order= (from a shared link or a
 * bookmarked view), the URL wins and no preference is applied — the user is
 * looking at a specific slice of data and we should not override it.
 *
 * Writes are debounced by 800ms so dragging through sort options does not
 * hammer the endpoint.
 */
export const useUserPreferencesSync = (): void => {
  const { token } = useAuthStore();
  const [params] = useSearchParams();
  const sort = useFilterStore((s) => s.sort);
  const order = useFilterStore((s) => s.order);
  const setSort = useFilterStore((s) => s.setSort);
  const setOrder = useFilterStore((s) => s.setOrder);
  const applied = useRef(false);

  const { data } = useQuery<UserPreferences>({
    queryKey: ['user', 'preferences'],
    queryFn: () => userPreferencesService.get(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  // Apply the saved preference on first load, but only when the URL has no
  // sort of its own.
  useEffect(() => {
    if (applied.current || !data) return;
    if (params.get('sort') || params.get('order')) {
      applied.current = true;
      return;
    }
    if (data.default_sort) setSort(data.default_sort);
    if (data.default_order) setOrder(data.default_order);
    applied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params]);

  const save = useMutation({
    mutationFn: (patch: UserPreferences) => userPreferencesService.patch(token!, patch),
  });

  // Persist changes. Skip the first run so merely loading the app does not
  // write the default back over itself.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!token) return;
    const id = setTimeout(() => {
      save.mutate({ default_sort: sort as SortKey, default_order: order as SortOrder });
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order, token]);
};
