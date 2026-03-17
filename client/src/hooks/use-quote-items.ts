import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { QuoteItem, InsertQuoteItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useQuoteItems(quoteId: number) {
  return useQuery({
    queryKey: [api.quoteItems.list.path, quoteId],
    queryFn: async () => {
      const url = buildUrl(api.quoteItems.list.path, { quoteId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quote items");
      const data = await res.json();
      return api.quoteItems.list.responses[200].parse(data);
    },
    enabled: !!quoteId,
  });
}

export function useCreateQuoteItem(quoteId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertQuoteItem, 'quoteId'>) => {
      const validated = api.quoteItems.create.input.parse(data);
      const url = buildUrl(api.quoteItems.create.path, { quoteId });
      const res = await fetch(url, {
        method: api.quoteItems.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add item to quote");
      return api.quoteItems.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quoteItems.list.path, quoteId] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, quoteId] });
      toast({ title: "Item added to quote", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateQuoteItem(quoteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, priceMultiplier }: { id: number; priceMultiplier: string }) => {
      const url = buildUrl(api.quoteItems.update.path, { quoteId, id });
      const res = await fetch(url, {
        method: api.quoteItems.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceMultiplier }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json() as Promise<QuoteItem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quoteItems.list.path, quoteId] });
    },
  });
}

export function useDeleteQuoteItem(quoteId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.quoteItems.delete.path, { quoteId, id });
      const res = await fetch(url, {
        method: api.quoteItems.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete item from quote");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quoteItems.list.path, quoteId] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, quoteId] });
      toast({ title: "Item removed from quote", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove item", description: error.message, variant: "destructive" });
    },
  });
}
