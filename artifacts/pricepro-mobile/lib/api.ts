import type { Customer, Product, Quote, QuoteItem, Communication } from "./types";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  customers: {
    list: () => request<Customer[]>("/customers"),
    get: (id: number) => request<Customer>(`/customers/${id}`),
  },
  products: {
    list: () => request<Product[]>("/products"),
  },
  quotes: {
    list: () => request<Quote[]>("/quotes"),
    get: (id: number) => request<Quote>(`/quotes/${id}`),
    create: (body: { customerName: string; customerEmail?: string | null; customerId?: number | null; status?: string }) =>
      request<Quote>("/quotes", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Quote>) =>
      request<Quote>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/quotes/${id}`, { method: "DELETE" }),
    send: (id: number) =>
      request<{ message: string }>(`/quotes/${id}/send`, { method: "POST" }),
  },
  quoteItems: {
    list: (quoteId: number) => request<QuoteItem[]>(`/quotes/${quoteId}/items`),
    create: (
      quoteId: number,
      body: { productId: number; quantity: number; unitPrice: string; priceMultiplier?: string },
    ) =>
      request<QuoteItem>(`/quotes/${quoteId}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (quoteId: number, id: number, body: Partial<QuoteItem>) =>
      request<QuoteItem>(`/quotes/${quoteId}/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (quoteId: number, id: number) =>
      request<void>(`/quotes/${quoteId}/items/${id}`, { method: "DELETE" }),
  },
  communications: {
    list: (quoteId: number) => request<Communication[]>(`/quotes/${quoteId}/communications`),
  },
};
