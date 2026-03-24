import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { useQuote, useUpdateQuote } from "@/hooks/use-quotes";
import { useQuoteItems, useCreateQuoteItem, useUpdateQuoteItem, useDeleteQuoteItem } from "@/hooks/use-quote-items";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle, Send, XCircle, FileText, TrendingUp, DollarSign, Target, Mail, RefreshCw, MessageSquare, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useCommunications, useSendQuote, useSyncReplies } from "@/hooks/use-communications";
import { useToast } from "@/hooks/use-toast";
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

function baselineWinRate(customerId: number, productId: number): number {
  const hash = ((customerId * 2654435761) ^ (productId * 2246822519)) >>> 0;
  return (hash % 4) + 2;
}

function calcWinRate(multiplier: number, customerId: number, productId: number): number {
  const baseline = baselineWinRate(customerId, productId);
  const rate = baseline * Math.exp(-2.5 * (multiplier - 1.0));
  return Math.max(0.01, Math.min(98, Math.round(rate * 100) / 100));
}

function winRateColor(rate: number): string {
  if (rate >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function winRateBarColor(rate: number): string {
  if (rate >= 8) return "bg-emerald-500";
  if (rate >= 4) return "bg-amber-500";
  return "bg-red-500";
}

function winRateLabel(rate: number): string {
  if (rate >= 10) return "Very Likely";
  if (rate >= 6) return "Likely";
  if (rate >= 4) return "Possible";
  if (rate >= 2) return "Unlikely";
  return "Long Shot";
}

const formatCurrency = (val: number | string | null | undefined) => {
  if (val == null) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function QuoteDetails() {
  const [, params] = useRoute("/quotes/:id");
  const quoteId = parseInt(params?.id || "0", 10);

  const { data: quote, isLoading: isLoadingQuote } = useQuote(quoteId);
  const { data: items, isLoading: isLoadingItems } = useQuoteItems(quoteId);
  const { data: products } = useProducts();

  const updateQuote = useUpdateQuote();
  const createItem = useCreateQuoteItem(quoteId);
  const updateItem = useUpdateQuoteItem(quoteId);
  const deleteItem = useDeleteQuoteItem(quoteId);

  const { data: comms, isLoading: isLoadingComms } = useCommunications(quoteId);
  const sendQuote = useSendQuote(quoteId);
  const syncReplies = useSyncReplies(quoteId);
  const { toast } = useToast();

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  // Per-item price multipliers: itemId → multiplier, seeded from DB values
  const [multipliers, setMultipliers] = useState<Record<number, number>>({});
  const getMult = (id: number) => multipliers[id] ?? 1.0;
  const setMult = (id: number, val: number) =>
    setMultipliers((prev) => ({ ...prev, [id]: val }));

  // Initialise multipliers from DB when items load (only for unseen item ids)
  useEffect(() => {
    if (!items) return;
    setMultipliers((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (!(item.id in next)) {
          next[item.id] = parseFloat(String(item.priceMultiplier ?? '1'));
        }
      }
      return next;
    });
  }, [items]);

  const form = useForm<z.infer<typeof itemFormSchema>>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0 },
  });

  const selectedProductId = form.watch("productId");

  useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) form.setValue("unitPrice", parseFloat(product.basePrice));
    }
  }, [selectedProductId, products, form]);

  // Base total (stored prices, no multiplier applied)
  const calculatedTotal = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.quantity * parseFloat(item.unitPrice), 0);
  }, [items]);

  // Quoted price = sum of per-item adjusted prices
  const quotedPrice = useMemo(() => {
    if (!items) return 0;
    return items.reduce(
      (sum, item) => sum + item.quantity * parseFloat(item.unitPrice) * getMult(item.id),
      0
    );
  }, [items, multipliers]);

  const totalCost = useMemo(() => {
    if (!items || !products) return null;
    let hasCost = false;
    let cost = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product?.cost) {
        hasCost = true;
        cost += item.quantity * parseFloat(product.cost);
      }
    }
    return hasCost ? cost : null;
  }, [items, products]);

  const grossMargin =
    totalCost != null && totalCost > 0
      ? ((quotedPrice - totalCost) / totalCost) * 100
      : null;

  // Sync base total to backend
  useEffect(() => {
    if (quote && items && calculatedTotal.toString() !== quote.totalAmount) {
      updateQuote.mutate({ id: quoteId, totalAmount: calculatedTotal.toString() });
    }
  }, [calculatedTotal, items, quote, quoteId]);

  const onAddItem = (values: z.infer<typeof itemFormSchema>) => {
    createItem.mutate(
      { productId: values.productId, quantity: values.quantity, unitPrice: values.unitPrice.toString() },
      { onSuccess: () => setIsAddItemOpen(false) }
    );
  };

  const handleStatusChange = (status: "draft" | "sent" | "accepted" | "rejected") => {
    updateQuote.mutate({ id: quoteId, status });
  };

  if (isLoadingQuote || !quote) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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
            {/* Header Card */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">Quote #{quote.id}</h1>
                  <p className="text-xl text-muted-foreground mt-1">{quote.customerName}</p>
                  {quote.customerEmail && <p className="text-sm text-muted-foreground mt-1">{quote.customerEmail}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Quoted Price</span>
                  <span className="text-4xl font-display font-bold text-primary" data-testid="text-quoted-price">
                    {formatCurrency(quotedPrice)}
                  </span>
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
                    <p
                      className={`text-lg font-semibold ${grossMargin != null && grossMargin >= 50 ? "text-emerald-600 dark:text-emerald-400" : grossMargin != null && grossMargin >= 25 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}
                      data-testid="text-margin"
                    >
                      {grossMargin != null ? `${grossMargin.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-foreground">Line Items</h3>
                {quote.status === "draft" && (
                  <Button
                    data-testid="button-add-item"
                    onClick={() => { form.reset({ productId: 0, quantity: 1, unitPrice: 0 }); setIsAddItemOpen(true); }}
                    size="sm"
                    className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
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
                      {quote.status === "draft" && <TableHead className="w-[80px]" />}
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
                        const product = products?.find((p) => p.id === item.productId);
                        const mult = getMult(item.id);
                        const linePrice = item.quantity * parseFloat(item.unitPrice) * mult;
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
                            {quote.status === "draft" && (
                              <TableCell className="text-right">
                                <Button
                                  data-testid={`button-delete-item-${item.id}`}
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  disabled={deleteItem.isPending}
                                  onClick={() => { if (confirm("Remove this item?")) deleteItem.mutate(item.id); }}
                                >
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

            {/* Per-Item Pricing & Win Rate */}
            {items && items.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-display font-semibold text-foreground">Pricing & Win Rate</h3>
                </div>
                <p className="text-sm text-muted-foreground">Adjust the price for each line item independently and see how it affects your win probability.</p>

                {items.map((item) => {
                  const product = products?.find((p) => p.id === item.productId);
                  const mult = getMult(item.id);
                  const baseLinePrice = item.quantity * parseFloat(item.unitPrice);
                  const adjLinePrice = baseLinePrice * mult;
                  const unitCost = product?.cost ? parseFloat(product.cost) : null;
                  const lineCost = unitCost != null ? item.quantity * unitCost : null;
                  const winRate = calcWinRate(mult, quote?.customerId ?? 0, item.productId);
                  const expectedRevenue = (winRate / 100) * adjLinePrice;

                  return (
                    <div key={item.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                      {/* Item Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className="font-semibold text-foreground">{product?.name || `Product #${item.productId}`}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {unitCost != null
                              ? <>Line cost: {formatCurrency(unitCost)} × {item.quantity} = {formatCurrency(lineCost)}</>
                              : <>{item.quantity} × {formatCurrency(item.unitPrice)}</>
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-0.5">Line Price</p>
                          <p className="text-2xl font-display font-bold text-primary" data-testid={`text-line-price-${item.id}`}>
                            {formatCurrency(adjLinePrice)}
                          </p>
                        </div>
                      </div>

                      {quote.status !== 'draft' && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                          <span>🔒</span> Pricing is locked — revert to Draft to make changes.
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Slider */}
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <Slider
                              data-testid={`slider-price-${item.id}`}
                              min={70}
                              max={200}
                              step={1}
                              value={[Math.round(mult * 100)]}
                              onValueChange={([val]) => setMult(item.id, val / 100)}
                              onValueCommit={([val]) => updateItem.mutate({ id: item.id, priceMultiplier: String(val / 100) })}
                              disabled={quote.status !== 'draft'}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{formatCurrency(baseLinePrice * 0.7)} <span className="opacity-60">(–30%)</span></span>
                              <span className="font-medium tabular-nums">{Math.round(mult * 100)}%</span>
                              <span>{formatCurrency(baseLinePrice * 2.0)} <span className="opacity-60">(+100%)</span></span>
                            </div>
                          </div>

                          {lineCost != null && (
                            <div className="flex items-center justify-between text-sm pt-3 border-t border-border/30">
                              <span className="text-muted-foreground">Gross profit (vs. cost)</span>
                              <span className={`font-semibold ${adjLinePrice > lineCost ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {formatCurrency(adjLinePrice - lineCost)}
                                {lineCost > 0 && <span className="font-normal text-xs ml-1">({(((adjLinePrice - lineCost) / lineCost) * 100).toFixed(1)}%)</span>}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Win Rate */}
                        <div className="space-y-3">
                          <div className="rounded-xl border border-border/50 p-4 bg-muted/20">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Win Rate / Day</p>
                              <span className={`text-xs font-semibold ${winRateColor(winRate)}`}>{winRateLabel(winRate)}</span>
                            </div>
                            <div className={`text-4xl font-display font-bold tabular-nums mb-2 ${winRateColor(winRate)}`} data-testid={`text-win-rate-${item.id}`}>
                              {winRate.toFixed(2)}%
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${winRateBarColor(winRate)}`}
                                style={{ width: `${winRate}%` }}
                                data-testid={`bar-win-rate-${item.id}`}
                              />
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/50 p-3 bg-muted/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Expected Revenue</p>
                              <p className="text-base font-semibold text-foreground" data-testid={`text-expected-revenue-${item.id}`}>
                                {formatCurrency(expectedRevenue)}
                              </p>
                              <p className="text-xs text-muted-foreground">{winRate.toFixed(2)}% × {formatCurrency(adjLinePrice)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Status Panel */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg mb-4">Quote Status</h3>
              <div className="space-y-3">
                {(["draft", "sent", "accepted", "rejected"] as const).map((status) => {
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
                    <div key={status} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${isActive ? colors[status] : "border-transparent bg-muted/30"}`}>
                      <span className="font-medium">{labels[status]}</span>
                      {isActive && <span className={`w-2 h-2 rounded-full ${dots[status]}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-2">
                {quote.status === "draft" && quote.customerEmail && (
                  <Button
                    data-testid="button-send-quote"
                    onClick={() => {
                      sendQuote.mutate(undefined, {
                        onSuccess: () => toast({ title: "Quote sent!", description: `Email sent to ${quote.customerEmail}` }),
                        onError: (err: any) => toast({ title: "Send failed", description: err.message || "Could not send email", variant: "destructive" }),
                      });
                    }}
                    disabled={sendQuote.isPending}
                    className="col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" /> {sendQuote.isPending ? "Sending..." : "Send Quote"}
                  </Button>
                )}
                {quote.status === "draft" && !quote.customerEmail && (
                  <Button data-testid="button-mark-sent" onClick={() => handleStatusChange("sent")} className="col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Mark as Sent
                  </Button>
                )}
                {quote.status === "sent" && (
                  <>
                    <Button data-testid="button-mark-won" onClick={() => handleStatusChange("accepted")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      <CheckCircle className="w-4 h-4 mr-1" /> Won
                    </Button>
                    <Button data-testid="button-mark-lost" onClick={() => handleStatusChange("rejected")} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/30">
                      <XCircle className="w-4 h-4 mr-1" /> Lost
                    </Button>
                    <Button data-testid="button-revert-draft-sent" onClick={() => handleStatusChange("draft")} variant="outline" className="col-span-2 rounded-xl text-muted-foreground">
                      Revert to Draft
                    </Button>
                  </>
                )}
                {(quote.status === "accepted" || quote.status === "rejected") && (
                  <Button data-testid="button-revert-draft" onClick={() => handleStatusChange("draft")} variant="outline" className="col-span-2 rounded-xl">
                    Revert to Draft
                  </Button>
                )}
              </div>
            </div>

            {/* Communication History */}
            {quote.customerEmail && (
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-display font-semibold text-lg">Communications</h3>
                  </div>
                  {comms && comms.length > 0 && (
                    <Button
                      data-testid="button-sync-replies"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => syncReplies.mutate(undefined, {
                        onSuccess: (data: any) => {
                          if (data.limited) {
                            toast({ title: "Reply syncing unavailable", description: "The Gmail connection only supports sending. Check your inbox directly for replies." });
                          } else if (data.newReplies > 0) {
                            toast({ title: `${data.newReplies} new reply(ies) synced` });
                          } else {
                            toast({ title: "No new replies" });
                          }
                        },
                        onError: () => toast({ title: "Sync failed", variant: "destructive" }),
                      })}
                      disabled={syncReplies.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncReplies.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>

                {isLoadingComms ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : !comms || comms.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-communications">No emails sent yet.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {comms.map((comm) => (
                      <div key={comm.id} data-testid={`comm-${comm.id}`} className={`p-3 rounded-xl border text-sm ${comm.direction === 'outbound' ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/20' : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {comm.direction === 'outbound' ? (
                            <ArrowUpRight className="w-3 h-3 text-blue-500" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                          )}
                          <span className="font-medium text-xs">
                            {comm.direction === 'outbound' ? 'Sent' : 'Reply'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {comm.sentAt ? new Date(comm.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        {comm.subject && <p className="font-medium text-xs truncate">{comm.subject}</p>}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {comm.direction === 'outbound' ? `Sent to ${comm.recipientEmail}` : comm.body.replace(/<[^>]*>/g, '').substring(0, 120)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {quote.status !== 'draft' && quote.customerEmail && (
                  <Button
                    data-testid="button-resend-quote"
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 rounded-xl"
                    onClick={() => {
                      sendQuote.mutate(undefined, {
                        onSuccess: () => toast({ title: "Quote re-sent!", description: `Email sent to ${quote.customerEmail}` }),
                        onError: (err: any) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
                      });
                    }}
                    disabled={sendQuote.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" /> {sendQuote.isPending ? "Sending..." : "Resend Quote"}
                  </Button>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Summary</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quoted price</span>
                  <span className="font-medium">{formatCurrency(quotedPrice)}</span>
                </div>
                {totalCost != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total cost</span>
                    <span className="font-medium">{formatCurrency(totalCost)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span className="text-muted-foreground">Quote ID</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{quote.id.toString().padStart(6, "0")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : "Unknown"}</span>
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
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select a product..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} — {formatCurrency(p.basePrice)}/unit
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
                      <Input type="number" min={1} placeholder="1" className="rounded-xl border-border/60" {...field} />
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
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" className="rounded-xl border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
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
