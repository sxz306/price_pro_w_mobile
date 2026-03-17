import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { useQuote, useUpdateQuote } from "@/hooks/use-quotes";
import { useQuoteItems, useCreateQuoteItem, useDeleteQuoteItem } from "@/hooks/use-quote-items";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle, Send, XCircle, FileText, TrendingUp, DollarSign, Target } from "lucide-react";
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

// Win rate curve: exponential decay
// multiplier 0.7 → ~95%, 1.0 → ~45%, 1.5 → ~13%, 2.0 → ~4%
function calcWinRate(multiplier: number): number {
  const rate = 95 * Math.exp(-2.5 * (multiplier - 0.7));
  return Math.max(2, Math.min(98, Math.round(rate)));
}

function winRateColor(rate: number): string {
  if (rate >= 65) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 35) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function winRateBarColor(rate: number): string {
  if (rate >= 65) return "bg-emerald-500";
  if (rate >= 35) return "bg-amber-500";
  return "bg-red-500";
}

function winRateLabel(rate: number): string {
  if (rate >= 75) return "Very Likely";
  if (rate >= 55) return "Likely";
  if (rate >= 35) return "Possible";
  if (rate >= 15) return "Unlikely";
  return "Long Shot";
}

const formatCurrency = (val: number | string | null | undefined) => {
  if (val == null) return "—";
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

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
  // Pricing multiplier: 0.7 = 70%, 1.0 = 100%, 2.0 = 200% of base total
  const [priceMultiplier, setPriceMultiplier] = useState(1.0);

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

  // Calculated totals
  const calculatedTotal = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
  }, [items]);

  const totalCost = useMemo(() => {
    if (!items || !products) return null;
    let hasCost = false;
    let cost = 0;
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product?.cost) {
        hasCost = true;
        cost += item.quantity * parseFloat(product.cost);
      }
    }
    return hasCost ? cost : null;
  }, [items, products]);

  // Adjust quoted price based on slider
  const quotedPrice = calculatedTotal * priceMultiplier;
  const winRate = calcWinRate(priceMultiplier);
  const expectedRevenue = (winRate / 100) * quotedPrice;

  const grossMargin = totalCost != null && quotedPrice > 0
    ? ((quotedPrice - totalCost) / quotedPrice) * 100
    : null;

  // Sync total with backend when it changes
  useEffect(() => {
    if (quote && items && calculatedTotal.toString() !== quote.totalAmount) {
      updateQuote.mutate({ id: quoteId, totalAmount: calculatedTotal.toString() });
    }
  }, [calculatedTotal, items, quote, quoteId]);

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
            {/* Header */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">Quote #{quote.id}</h1>
                  <p className="text-xl text-muted-foreground mt-1">{quote.customerName}</p>
                  {quote.customerEmail && <p className="text-sm text-muted-foreground mt-1">{quote.customerEmail}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Quoted Price</span>
                  <span className="text-4xl font-display font-bold text-primary">{formatCurrency(quotedPrice)}</span>
                </div>
              </div>

              {/* Cost Summary Strip */}
              {totalCost != null && (
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Cost</p>
                    <p className="text-lg font-semibold text-foreground" data-testid="text-total-cost">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className="text-center border-x border-border/40">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gross Profit</p>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400" data-testid="text-gross-profit">{formatCurrency(quotedPrice - totalCost)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Margin</p>
                    <p className={`text-lg font-semibold ${grossMargin != null && grossMargin >= 50 ? 'text-emerald-600 dark:text-emerald-400' : grossMargin != null && grossMargin >= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-margin">
                      {grossMargin != null ? `${grossMargin.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-foreground">Line Items</h3>
                {quote.status === 'draft' && (
                  <Button data-testid="button-add-item" onClick={() => { form.reset({ productId: 0, quantity: 1, unitPrice: 0 }); setIsAddItemOpen(true); }} size="sm" className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto border border-border/50 rounded-xl">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right text-muted-foreground">Unit Cost</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right text-muted-foreground">Line Cost</TableHead>
                      <TableHead className="text-right font-semibold">Line Price</TableHead>
                      {quote.status === 'draft' && <TableHead className="w-[80px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingItems ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : !items || items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          No items added to this quote yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const product = products?.find(p => p.id === item.productId);
                        const linePrice = item.quantity * parseFloat(item.unitPrice);
                        const unitCost = product?.cost ? parseFloat(product.cost) : null;
                        const lineCost = unitCost != null ? item.quantity * unitCost : null;
                        return (
                          <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                            <TableCell className="font-medium">
                              {product?.name || `Product #${item.productId}`}
                              {product?.category && (
                                <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{product.category}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">{unitCost != null ? formatCurrency(unitCost) : "—"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">{lineCost != null ? formatCurrency(lineCost) : "—"}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(linePrice)}</TableCell>
                            {quote.status === 'draft' && (
                              <TableCell className="text-right">
                                <Button data-testid={`button-delete-item-${item.id}`} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteItem.mutate(item.id)}>
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

            {/* Pricing & Win Rate Panel */}
            {calculatedTotal > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-display font-semibold text-foreground">Pricing & Win Rate</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Scroll the slider to explore how price affects your probability of winning this deal.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Slider Column */}
                  <div className="space-y-5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Quoted Price</span>
                      <span className="text-2xl font-display font-bold text-foreground" data-testid="text-quoted-price">
                        {formatCurrency(quotedPrice)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <Slider
                        data-testid="slider-price"
                        min={70}
                        max={200}
                        step={1}
                        value={[Math.round(priceMultiplier * 100)]}
                        onValueChange={([val]) => setPriceMultiplier(val / 100)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(calculatedTotal * 0.7)} <span className="opacity-60">(–30%)</span></span>
                        <span className="font-medium">{Math.round(priceMultiplier * 100)}%</span>
                        <span>{formatCurrency(calculatedTotal * 2.0)} <span className="opacity-60">(+100%)</span></span>
                      </div>
                    </div>

                    {/* Price relative to base */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">vs. base line total</span>
                      <span className={`font-medium ${priceMultiplier > 1 ? 'text-amber-600 dark:text-amber-400' : priceMultiplier < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {priceMultiplier > 1 ? "+" : ""}{((priceMultiplier - 1) * 100).toFixed(0)}%
                        {" "}({formatCurrency(quotedPrice - calculatedTotal)})
                      </span>
                    </div>

                    {totalCost != null && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                        <span className="text-muted-foreground">Gross profit at this price</span>
                        <span className={`font-semibold ${quotedPrice > totalCost ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(quotedPrice - totalCost)} ({grossMargin != null ? `${grossMargin.toFixed(1)}%` : "—"})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Win Rate Column */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/50 p-5 bg-muted/20 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Estimated Win Rate</p>
                      <div className={`text-6xl font-display font-bold mb-1 tabular-nums ${winRateColor(winRate)}`} data-testid="text-win-rate">
                        {winRate}%
                      </div>
                      <div className={`text-sm font-medium ${winRateColor(winRate)}`}>{winRateLabel(winRate)}</div>

                      {/* Bar */}
                      <div className="mt-4 w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${winRateBarColor(winRate)}`}
                          style={{ width: `${winRate}%` }}
                          data-testid="bar-win-rate"
                        />
                      </div>
                    </div>

                    {/* Expected Value */}
                    <div className="rounded-xl border border-border/50 p-4 bg-muted/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Expected Revenue</p>
                        <p className="text-lg font-semibold text-foreground" data-testid="text-expected-revenue">
                          {formatCurrency(expectedRevenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">{winRate}% × {formatCurrency(quotedPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Status Panel */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg mb-4">Quote Status</h3>

              <div className="space-y-3">
                {(["draft", "sent", "accepted", "rejected"] as const).map(status => {
                  const colors: Record<string, string> = {
                    draft: "border-gray-500 bg-gray-500/10",
                    sent: "border-blue-500 bg-blue-500/10",
                    accepted: "border-emerald-500 bg-emerald-500/10",
                    rejected: "border-red-500 bg-red-500/10",
                  };
                  const dots: Record<string, string> = {
                    draft: "bg-gray-500",
                    sent: "bg-blue-500",
                    accepted: "bg-emerald-500",
                    rejected: "bg-red-500",
                  };
                  const labels: Record<string, string> = {
                    draft: "Draft",
                    sent: "Sent to Customer",
                    accepted: "Accepted",
                    rejected: "Rejected",
                  };
                  const isActive = quote.status === status;
                  return (
                    <div key={status} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${isActive ? colors[status] : 'border-transparent bg-muted/30'}`}>
                      <span className="font-medium">{labels[status]}</span>
                      {isActive && <span className={`w-2 h-2 rounded-full ${dots[status]}`}></span>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-2">
                {quote.status === 'draft' && (
                  <Button data-testid="button-mark-sent" onClick={() => handleStatusChange('sent')} className="col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Mark as Sent
                  </Button>
                )}
                {quote.status === 'sent' && (
                  <>
                    <Button data-testid="button-mark-won" onClick={() => handleStatusChange('accepted')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      <CheckCircle className="w-4 h-4 mr-1" /> Won
                    </Button>
                    <Button data-testid="button-mark-lost" onClick={() => handleStatusChange('rejected')} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/30">
                      <XCircle className="w-4 h-4 mr-1" /> Lost
                    </Button>
                  </>
                )}
                {(quote.status === 'accepted' || quote.status === 'rejected') && (
                  <Button data-testid="button-revert-draft" onClick={() => handleStatusChange('draft')} variant="outline" className="col-span-2 rounded-xl">
                    Revert to Draft
                  </Button>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Summary</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Line total</span>
                  <span className="font-medium">{formatCurrency(calculatedTotal)}</span>
                </div>
                {totalCost != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total cost</span>
                    <span className="font-medium">{formatCurrency(totalCost)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span className="text-muted-foreground">Quote ID</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{quote.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
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
                        <SelectTrigger data-testid="select-product" className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} — {formatCurrency(p.basePrice)}
                            {p.cost ? ` (cost: ${formatCurrency(p.cost)})` : ""}
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
                        <Input type="number" min="1" data-testid="input-item-quantity" className="rounded-xl border-border/60" {...field} />
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
                        <Input type="number" step="0.01" data-testid="input-item-unit-price" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" data-testid="button-add-item-submit" disabled={createItem.isPending} className="rounded-xl shadow-md shadow-primary/20">
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
