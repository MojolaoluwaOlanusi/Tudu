import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  templateService,
  type InstallTemplateInput,
  type MarketplaceTemplate,
} from '../services/templateService';
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

export const useMarketplaceTemplates = () => {
  return useQuery<MarketplaceTemplate[]>({
    queryKey: ['marketplace-templates'],
    queryFn: () => templateService.listMarketplace(),
  });
};

export const useInstallMarketplaceTemplate = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Board, unknown, { id: string }>({
    mutationFn: ({ id }) => templateService.installMarketplace(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['marketplace-templates'] });
    },
  });
};

export const usePublishTemplate = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    MarketplaceTemplate,
    unknown,
    { board_id: string; name: string; description: string; category: string }
  >({
    mutationFn: (data) => templateService.publish(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-templates'] });
    },
  });
};
