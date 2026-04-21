import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Customer, InsertCustomer, UpdateCustomerRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCustomers() {
  return useQuery({
    queryKey: [api.customers.list.path],
    queryFn: async () => {
      const res = await fetch(api.customers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      return data as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create customer");
      }
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer created", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create customer", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCustomerRequest) => {
      const url = buildUrl(api.customers.update.path, { id });
      const res = await fetch(url, {
        method: api.customers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer updated", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update customer", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.customers.delete.path, { id });
      const res = await fetch(url, {
        method: api.customers.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer deleted", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete customer", description: error.message, variant: "destructive" });
    },
  });
}
