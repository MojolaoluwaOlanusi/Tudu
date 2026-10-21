import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  templateService,
  type InstallTemplateInput,
  type MarketplaceTemplate,
  type TemplatePurchase,
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
  return useMutation<Board, unknown, { id: string; reference?: string }>({
    mutationFn: ({ id, reference }) => templateService.installMarketplace(token!, id, reference),
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
    {
      board_id: string;
      name: string;
      description: string;
      category: string;
      price_kobo: number;
      rental_days: number;
    }
  >({
    mutationFn: (data) => templateService.publish(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-templates'] });
    },
  });
};

export const useCheckoutMarketplace = () => {
  const { token } = useAuthStore();
  return useMutation<
    { access_code: string; reference: string; authorization_url: string; amount_kobo: number },
    unknown,
    string
  >({
    mutationFn: (id) => templateService.checkoutMarketplace(token!, id),
  });
};

export const useMyTemplatePurchases = () => {
  const { token } = useAuthStore();
  return useQuery<TemplatePurchase[]>({
    queryKey: ['template-purchases'],
    queryFn: () => templateService.listMyPurchases(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
};

export const useRefundTemplatePurchase = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (reference) => templateService.refundPurchase(token!, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-purchases'] });
    },
  });
};
