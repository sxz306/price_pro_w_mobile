import { apiFetch } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { Communication } from "@shared/schema";

export function useCommunications(quoteId: number) {
  return useQuery<Communication[]>({
    queryKey: ['/api/quotes', quoteId, 'communications'],
    queryFn: async () => {
      const res = await apiFetch(`/api/quotes/${quoteId}/communications`);
      if (!res.ok) throw new Error('Failed to fetch communications');
      return res.json();
    },
    enabled: quoteId > 0,
  });
}

export function useSendQuote(quoteId: number) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/quotes/${quoteId}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', quoteId, 'communications'] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, quoteId] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
    },
  });
}

export function useSyncReplies(quoteId: number) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/quotes/${quoteId}/sync-replies`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', quoteId, 'communications'] });
    },
  });
}
