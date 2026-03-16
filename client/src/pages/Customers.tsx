import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";
import type { Customer } from "@shared/schema";

const SIZES = ["xlarge", "large", "medium", "small"] as const;
const REGIONS = ["East", "Midwest", "Southeast", "Southwest"] as const;

const SIZE_COLORS: Record<string, string> = {
  xlarge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  large:  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  small:  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
};

const REGION_COLORS: Record<string, string> = {
  East:      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  Midwest:   "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  Southeast: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  Southwest: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
};

const customerFormSchema = insertCustomerSchema;
type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const { data: customerList, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", size: "medium", region: "East", email: "" },
  });

  const openCreate = () => {
    setEditingCustomer(null);
    form.reset({ name: "", size: "medium", region: "East", email: "" });
    setIsFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({ name: customer.name, size: customer.size, region: customer.region, email: customer.email || "" });
    setIsFormOpen(true);
  };

  const onSubmit = (values: CustomerFormValues) => {
    const payload = { ...values, email: values.email || null };
    if (editingCustomer) {
      updateCustomer.mutate({ id: editingCustomer.id, ...payload }, { onSuccess: () => setIsFormOpen(false) });
    } else {
      createCustomer.mutate(payload, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const filtered = customerList?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.region.toLowerCase().includes(search.toLowerCase()) ||
    c.size.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const Badge = ({ label, colorMap }: { label: string; colorMap: Record<string, string> }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${colorMap[label] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {label}
    </span>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customer accounts and segments.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-customer" className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 font-medium px-6">
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, region, or size..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-customers"
                className="pl-9 rounded-xl bg-background border-border shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Size</TableHead>
                  <TableHead className="font-semibold text-foreground">Region</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Email</TableHead>
                  <TableHead className="font-semibold text-foreground w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p>No customers found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-foreground">{customer.name}</TableCell>
                      <TableCell><Badge label={customer.size} colorMap={SIZE_COLORS} /></TableCell>
                      <TableCell><Badge label={customer.region} colorMap={REGION_COLORS} /></TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{customer.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            data-testid={`button-edit-customer-${customer.id}`}
                            onClick={() => openEdit(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-customer-${customer.id}`}
                            onClick={() => { if (confirm("Delete this customer?")) deleteCustomer.mutate(customer.id); }}
                          >
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
        <DialogContent className="sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-border/60">
          <div className="p-6 bg-muted/10 border-b border-border/50">
            <DialogTitle className="text-2xl font-display">
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Industries..." data-testid="input-customer-name" className="rounded-xl border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-size" className="rounded-xl border-border/60">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SIZES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-region" className="rounded-xl border-border/60">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@company.com" data-testid="input-customer-email" className="rounded-xl border-border/60" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending} data-testid="button-submit-customer" className="rounded-xl shadow-md shadow-primary/20">
                  {(createCustomer.isPending || updateCustomer.isPending) ? "Saving..." : editingCustomer ? "Save Changes" : "Add Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
