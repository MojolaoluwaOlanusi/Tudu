import { useMutation, useQueryClient } from '@tanstack/react-query';
import { templateService, type InstallTemplateInput } from '../services/templateService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import type { Board } from '../types/board';

/**
 * Creates a board from a template and refreshes boards + tasks so the new
 * board shows up in the switcher and its example cards appear when opened.
 */
export const useInstallTemplate = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    Board,
    unknown,
    { slug: string; input?: InstallTemplateInput }
  >({
    mutationFn: ({ slug, input }) => templateService.install(token!, slug, input ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
