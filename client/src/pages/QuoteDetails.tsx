import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { useQuote, useUpdateQuote } from "@/hooks/use-quotes";
import { useQuoteItems, useCreateQuoteItem, useDeleteQuoteItem } from "@/hooks/use-quote-items";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle, Send, XCircle, FileText } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const itemFormSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
});

export default function QuoteDetails() {
  const [, params] = useRoute("/quotes/:id");
  const quoteId = parseInt(params?.id || "0", 10);

  const { data: quote, isLoading: isLoadingQuote } = useQuote(quoteId);
  const { data: items, isLoading: isLoadingItems } = useQuoteItems(quoteId);
  const { data: products } = useProducts();

  const updateQuote = useUpdateQuote();
  const createItem = useCreateQuoteItem(quoteId);
  const deleteItem = useDeleteQuoteItem(quoteId);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  const form = useForm<z.infer<typeof itemFormSchema>>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0 },
  });

  const selectedProductId = form.watch("productId");
  
  // Auto-fill price when product changes
  useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        form.setValue("unitPrice", parseFloat(product.basePrice));
      }
    }
  }, [selectedProductId, products, form]);

  const calculatedTotal = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
  }, [items]);

  // Sync total with backend when it changes
  useEffect(() => {
    if (quote && items && calculatedTotal.toString() !== quote.totalAmount) {
      updateQuote.mutate({ id: quoteId, totalAmount: calculatedTotal.toString() });
    }
  }, [calculatedTotal, items, quote, quoteId]); // Note: omitted updateQuote from deps to prevent loop, safely managed by checks

  const onAddItem = (values: z.infer<typeof itemFormSchema>) => {
    createItem.mutate({
      productId: values.productId,
      quantity: values.quantity,
      unitPrice: values.unitPrice.toString(),
    }, {
      onSuccess: () => setIsAddItemOpen(false)
    });
  };

  const handleStatusChange = (status: "draft" | "sent" | "accepted" | "rejected") => {
    updateQuote.mutate({ id: quoteId, status });
  };

  if (isLoadingQuote || !quote) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (val: number | string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(typeof val === 'string' ? parseFloat(val) : val);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 text-muted-foreground mb-4">
          <Link href="/quotes" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Quotes
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">Quote #{quote.id}</h1>
                  <p className="text-xl text-muted-foreground mt-1">{quote.customerName}</p>
                  {quote.customerEmail && <p className="text-sm text-muted-foreground mt-1">{quote.customerEmail}</p>}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-muted-foreground mb-1">Total Amount</span>
                  <span className="text-4xl font-display font-bold text-primary">{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-foreground">Line Items</h3>
                {quote.status === 'draft' && (
                  <Button onClick={() => { form.reset({ productId: 0, quantity: 1, unitPrice: 0 }); setIsAddItemOpen(true); }} size="sm" className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto border border-border/50 rounded-xl">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      {quote.status === 'draft' && <TableHead className="w-[80px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingItems ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : !items || items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          No items added to this quote yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const product = products?.find(p => p.id === item.productId);
                        const lineTotal = item.quantity * parseFloat(item.unitPrice);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{product?.name || `Product #${item.productId}`}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(lineTotal)}</TableCell>
                            {quote.status === 'draft' && (
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteItem.mutate(item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg mb-4">Quote Status</h3>
              
              <div className="space-y-3">
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${quote.status === 'draft' ? 'border-gray-500 bg-gray-500/10' : 'border-transparent bg-muted/30'}`}>
                  <span className="font-medium">Draft</span>
                  {quote.status === 'draft' && <span className="w-2 h-2 rounded-full bg-gray-500"></span>}
                </div>
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${quote.status === 'sent' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-muted/30'}`}>
                  <span className="font-medium">Sent to Customer</span>
                  {quote.status === 'sent' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                </div>
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${quote.status === 'accepted' ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent bg-muted/30'}`}>
                  <span className="font-medium">Accepted</span>
                  {quote.status === 'accepted' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                </div>
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${quote.status === 'rejected' ? 'border-red-500 bg-red-500/10' : 'border-transparent bg-muted/30'}`}>
                  <span className="font-medium">Rejected</span>
                  {quote.status === 'rejected' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-2">
                {quote.status === 'draft' && (
                  <Button onClick={() => handleStatusChange('sent')} className="col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Mark as Sent
                  </Button>
                )}
                {quote.status === 'sent' && (
                  <>
                    <Button onClick={() => handleStatusChange('accepted')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      <CheckCircle className="w-4 h-4 mr-1" /> Won
                    </Button>
                    <Button onClick={() => handleStatusChange('rejected')} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/30">
                      <XCircle className="w-4 h-4 mr-1" /> Lost
                    </Button>
                  </>
                )}
                {(quote.status === 'accepted' || quote.status === 'rejected') && (
                  <Button onClick={() => handleStatusChange('draft')} variant="outline" className="col-span-2 rounded-xl">
                    Revert to Draft
                  </Button>
                )}
              </div>
            </div>
            
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quote ID</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{quote.id.toString().padStart(6, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-border/60">
          <div className="p-6 bg-muted/10 border-b border-border/50">
            <DialogTitle className="text-2xl font-display">Add Line Item</DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddItem)} className="p-6 space-y-5">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} - {formatCurrency(p.basePrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createItem.isPending} className="rounded-xl shadow-md shadow-primary/20">
                  {createItem.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
