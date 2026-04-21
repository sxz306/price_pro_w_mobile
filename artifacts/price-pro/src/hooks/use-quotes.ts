import { apiFetch } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Quote, InsertQuote, UpdateQuoteRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useQuotes() {
  return useQuery({
    queryKey: [api.quotes.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.quotes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      return api.quotes.list.responses[200].parse(data);
    },
  });
}

export function useQuote(id: number) {
  return useQuery({
    queryKey: [api.quotes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.quotes.get.path, { id });
      const res = await apiFetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch quote");
      const data = await res.json();
      return api.quotes.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertQuote) => {
      const validated = api.quotes.create.input.parse(data);
      const res = await apiFetch(api.quotes.create.path, {
        method: api.quotes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create quote");
      return api.quotes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: "Quote created", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create quote", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateQuoteRequest) => {
      const validated = api.quotes.update.input.parse(updates);
      const url = buildUrl(api.quotes.update.path, { id });
      const res = await apiFetch(url, {
        method: api.quotes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update quote");
      return api.quotes.update.responses[200].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, variables.id] });
      toast({ title: "Quote updated", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update quote", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.quotes.delete.path, { id });
      const res = await apiFetch(url, {
        method: api.quotes.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete quote");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: "Quote deleted", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete quote", description: error.message, variant: "destructive" });
    },
  });
}
