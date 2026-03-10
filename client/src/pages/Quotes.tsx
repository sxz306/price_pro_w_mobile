import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuotes, useCreateQuote, useDeleteQuote } from "@/hooks/use-quotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Search, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useLocation } from "wouter";

const quoteFormSchema = insertQuoteSchema.omit({ status: true, totalAmount: true });

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<z.infer<typeof quoteFormSchema>>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
    },
  });

  const onSubmit = (values: z.infer<typeof quoteFormSchema>) => {
    createQuote.mutate({
      ...values,
      status: "draft",
      totalAmount: "0"
    }, {
      onSuccess: (data) => {
        setIsFormOpen(false);
        setLocation(`/quotes/${data.id}`);
      }
    });
  };

  const formatCurrency = (val: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val || "0"));

  const filteredQuotes = quotes?.filter(q => 
    q.customerName.toLowerCase().includes(search.toLowerCase()) || 
    (q.customerEmail && q.customerEmail.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
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
          <Button onClick={() => setIsFormOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 font-medium px-6">
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
                className="pl-9 rounded-xl bg-background border-border shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Customer</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-foreground w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground flex-col items-center justify-center">
                      <Search className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No quotes found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => (
                    <TableRow key={quote.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="font-medium text-foreground">{quote.customerName}</div>
                        {quote.customerEmail && <div className="text-sm text-muted-foreground">{quote.customerEmail}</div>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell className="text-right font-display font-semibold text-base">{formatCurrency(quote.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                            <Link href={`/quotes/${quote.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                            e.preventDefault();
                            if(confirm("Are you sure you want to delete this quote?")) deleteQuote.mutate(quote.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-border/60">
          <div className="p-6 bg-muted/10 border-b border-border/50">
            <DialogTitle className="text-2xl font-display">New Quote</DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp..." className="rounded-xl border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Customer Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@acme.com" className="rounded-xl border-border/60" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createQuote.isPending} className="rounded-xl shadow-md shadow-primary/20">
                  {createQuote.isPending ? "Creating..." : "Create Draft"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
