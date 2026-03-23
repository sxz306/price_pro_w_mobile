import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuotes, useCreateQuote, useDeleteQuote } from "@/hooks/use-quotes";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { QuoteItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Search, ArrowRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const newQuoteSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});
type NewQuoteForm = z.infer<typeof newQuoteSchema>;

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: allItems } = useQuery<QuoteItem[]>({
    queryKey: [api.quoteItems.listAll.path],
    queryFn: async () => {
      const res = await fetch(api.quoteItems.listAll.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const quoteTotals = (quoteId: number) => {
    const items = allItems?.filter(i => i.quoteId === quoteId) || [];
    let totalCost = 0;
    let quotedPrice = 0;
    for (const item of items) {
      const cost = parseFloat(String(item.unitPrice)) * item.quantity;
      const mult = parseFloat(String(item.priceMultiplier ?? '1'));
      totalCost += cost;
      quotedPrice += cost * mult;
    }
    return { totalCost, quotedPrice };
  };
  const deleteQuote = useDeleteQuote();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  type SortKey = 'id' | 'customer' | 'date' | 'status' | 'totalCost' | 'quotedPrice';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 ml-1" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  };

  const form = useForm<NewQuoteForm>({
    resolver: zodResolver(newQuoteSchema),
    defaultValues: { customerId: "", productId: "", quantity: 1 },
  });

  const onSubmit = async (values: NewQuoteForm) => {
    const customer = customers?.find(c => c.id === Number(values.customerId));
    const product = products?.find(p => p.id === Number(values.productId));
    if (!customer || !product) return;

    setIsSubmitting(true);
    try {
      // 1. Create the quote
      const quoteRes = await fetch(api.quotes.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email || null,
          status: "draft",
          totalAmount: "0",
        }),
      });
      if (!quoteRes.ok) throw new Error("Failed to create quote");
      const quote = await quoteRes.json();

      // 2. Add the first line item
      const itemUrl = buildUrl(api.quoteItems.create.path, { quoteId: quote.id });
      const itemRes = await fetch(itemUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: product.id,
          quantity: values.quantity,
          unitPrice: product.basePrice,
        }),
      });
      if (!itemRes.ok) throw new Error("Failed to add item");

      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: "Quote created" });
      setIsFormOpen(false);
      setLocation(`/quotes/${quote.id}`);
    } catch (err: any) {
      toast({ title: "Failed to create quote", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(val || "0"));

  const statusOrder: Record<string, number> = { draft: 0, sent: 1, accepted: 2, rejected: 3 };

  const filteredQuotes = (quotes?.filter(q =>
    q.customerName.toLowerCase().includes(search.toLowerCase()) ||
    (q.customerEmail && q.customerEmail.toLowerCase().includes(search.toLowerCase()))
  ) || []).sort((a, b) => {
    let cmp = 0;
    const aTotals = quoteTotals(a.id);
    const bTotals = quoteTotals(b.id);
    switch (sortKey) {
      case 'id': cmp = a.id - b.id; break;
      case 'customer': cmp = a.customerName.localeCompare(b.customerName); break;
      case 'date': cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); break;
      case 'status': cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99); break;
      case 'totalCost': cmp = aTotals.totalCost - bTotals.totalCost; break;
      case 'quotedPrice': cmp = aTotals.quotedPrice - bTotals.quotedPrice; break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      draft:    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      sent:     "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
      accepted: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
      rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Quotes</h1>
            <p className="text-muted-foreground mt-1">Create and manage your customer quotes.</p>
          </div>
          <Button onClick={() => { form.reset({ customerId: "", productId: "", quantity: 1 }); setIsFormOpen(true); }} data-testid="button-new-quote" className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 font-medium px-6">
            <Plus className="w-5 h-5 mr-2" />
            New Quote
          </Button>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-quotes"
                className="pl-9 rounded-xl bg-background border-border shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground w-[60px] cursor-pointer select-none" onClick={() => toggleSort('id')} data-testid="sort-id">
                    <span className="inline-flex items-center">ID<SortIcon col="id" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground cursor-pointer select-none" onClick={() => toggleSort('customer')} data-testid="sort-customer">
                    <span className="inline-flex items-center">Customer<SortIcon col="customer" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('date')} data-testid="sort-date">
                    <span className="inline-flex items-center">Date<SortIcon col="date" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground cursor-pointer select-none" onClick={() => toggleSort('status')} data-testid="sort-status">
                    <span className="inline-flex items-center">Status<SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right cursor-pointer select-none" onClick={() => toggleSort('totalCost')} data-testid="sort-total-cost">
                    <span className="inline-flex items-center justify-end">Total Cost<SortIcon col="totalCost" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right cursor-pointer select-none" onClick={() => toggleSort('quotedPrice')} data-testid="sort-quoted-price">
                    <span className="inline-flex items-center justify-end">Quoted Price<SortIcon col="quotedPrice" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No quotes found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                    const { totalCost, quotedPrice } = quoteTotals(quote.id);
                    return (
                    <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-muted-foreground">#{quote.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{quote.customerName}</div>
                        {quote.customerEmail && <div className="text-sm text-muted-foreground">{quote.customerEmail}</div>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={quote.status} /></TableCell>
                      <TableCell className="text-right font-display font-semibold text-base">{formatCurrency(String(totalCost))}</TableCell>
                      <TableCell className="text-right font-display font-semibold text-base">{formatCurrency(String(quotedPrice))}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" data-testid={`button-open-quote-${quote.id}`}>
                            <Link href={`/quotes/${quote.id}`}><ArrowRight className="h-4 w-4" /></Link>
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-delete-quote-${quote.id}`}
                            onClick={(e) => { e.preventDefault(); if (confirm("Delete this quote?")) deleteQuote.mutate(quote.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border-border/60">
          <div className="p-6 bg-muted/10 border-b border-border/50">
            <DialogTitle className="text-2xl font-display">New Quote</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Select a customer and starting product.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-quote-customer" className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select a customer..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{c.region} · {c.size}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-quote-product" className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select a product..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">${parseFloat(p.basePrice).toFixed(2)}/unit</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="1"
                        data-testid="input-quote-quantity"
                        className="rounded-xl border-border/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-quote" className="rounded-xl shadow-md shadow-primary/20">
                  {isSubmitting ? "Creating..." : "Create Quote"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
