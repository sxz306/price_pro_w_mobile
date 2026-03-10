import React, { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useQuotes } from "@/hooks/use-quotes";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from "recharts";
import { FileText, DollarSign, CheckCircle2, Package, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: quotes, isLoading: isLoadingQuotes } = useQuotes();
  const { data: products, isLoading: isLoadingProducts } = useProducts();

  const stats = useMemo(() => {
    if (!quotes || !products) return null;

    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === "accepted");
    const totalValue = quotes.reduce((sum, q) => sum + parseFloat(q.totalAmount || "0"), 0);
    const acceptedValue = acceptedQuotes.reduce((sum, q) => sum + parseFloat(q.totalAmount || "0"), 0);

    const statusCounts = {
      draft: quotes.filter(q => q.status === "draft").length,
      sent: quotes.filter(q => q.status === "sent").length,
      accepted: acceptedQuotes.length,
      rejected: quotes.filter(q => q.status === "rejected").length,
    };

    const chartData = [
      { name: "Draft", value: statusCounts.draft, color: "hsl(var(--muted-foreground))" },
      { name: "Sent", value: statusCounts.sent, color: "hsl(var(--primary))" },
      { name: "Accepted", value: statusCounts.accepted, color: "hsl(142 71% 45%)" },
      { name: "Rejected", value: statusCounts.rejected, color: "hsl(0 84% 60%)" },
    ];

    return { totalQuotes, acceptedQuotes, totalValue, acceptedValue, chartData, totalProducts: products.length };
  }, [quotes, products]);

  const recentQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [quotes]);

  if (isLoadingQuotes || isLoadingProducts || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your pipeline today.</p>
          </div>
          <Link href="/quotes" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all">
            Create Quote
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Pipeline</p>
                  <p className="text-3xl font-display font-bold tracking-tight">{formatCurrency(stats.totalValue)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Closed Won</p>
                  <p className="text-3xl font-display font-bold tracking-tight text-emerald-600 dark:text-emerald-500">{formatCurrency(stats.acceptedValue)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                  <p className="text-3xl font-display font-bold tracking-tight">{stats.totalQuotes}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-500">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Products</p>
                  <p className="text-3xl font-display font-bold tracking-tight">{stats.totalProducts}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500">
                  <Package className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">Quotes by Status</CardTitle>
              <CardDescription>Current snapshot of your pipeline distribution.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="font-display">Recent Quotes</CardTitle>
                <CardDescription>Latest generated quotes</CardDescription>
              </div>
              <Link href="/quotes" className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4 mt-4">
                {recentQuotes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No quotes yet</div>
                ) : (
                  recentQuotes.map((quote) => (
                    <Link key={quote.id} href={`/quotes/${quote.id}`} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {quote.customerName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                              quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                              quote.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {quote.status}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-semibold ml-4 text-sm">
                          {formatCurrency(parseFloat(quote.totalAmount || "0"))}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
