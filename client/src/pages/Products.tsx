import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, PackageSearch, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Product } from "@shared/schema";

const productFormSchema = insertProductSchema.extend({
  basePrice: z.coerce.number().min(0, "Price must be positive"),
  cost: z.coerce.number().min(0, "Cost must be positive").optional(),
});

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  type SortKey = 'id' | 'name' | 'category' | 'cost';
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

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      cost: undefined,
      category: "",
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    form.reset({ name: "", description: "", basePrice: 0, cost: undefined, category: "" });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      basePrice: parseFloat(product.basePrice),
      cost: product.cost ? parseFloat(product.cost) : undefined,
      category: product.category,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof productFormSchema>) => {
    const payload = {
      ...values,
      basePrice: values.basePrice.toString(),
      cost: values.cost != null ? values.cost.toString() : null,
    };

    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, ...payload },
        { onSuccess: () => setIsFormOpen(false) }
      );
    } else {
      createProduct.mutate(payload as any, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const formatCurrency = (val: string | null | undefined) => {
    if (!val) return "—";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
  };

  const filteredProducts = (products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  ) || []).sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'id': cmp = a.id - b.id; break;
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'category': cmp = a.category.localeCompare(b.category); break;
      case 'cost': cmp = parseFloat(a.cost || '0') - parseFloat(b.cost || '0'); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your catalog, pricing, and costs.</p>
          </div>
          <Button onClick={handleOpenCreate} className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 font-medium px-6">
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
              <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-products"
                className="pl-9 rounded-xl bg-background border-border shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground w-[60px] cursor-pointer select-none" onClick={() => toggleSort('id')} data-testid="sort-product-id">
                    <span className="inline-flex items-center">ID<SortIcon col="id" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground cursor-pointer select-none" onClick={() => toggleSort('name')} data-testid="sort-product-name">
                    <span className="inline-flex items-center">Name<SortIcon col="name" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('category')} data-testid="sort-product-category">
                    <span className="inline-flex items-center">Category<SortIcon col="category" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground hidden lg:table-cell">Description</TableHead>
                  <TableHead className="font-semibold text-foreground text-right cursor-pointer select-none" onClick={() => toggleSort('cost')} data-testid="sort-product-cost">
                    <span className="inline-flex items-center justify-end">Unit Cost<SortIcon col="cost" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <PackageSearch className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No products found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-muted-foreground">#{product.id}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                            {product.category}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground truncate max-w-xs">{product.description}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" data-testid={`button-edit-product-${product.id}`} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-product-${product.id}`} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => {
                              if (confirm("Are you sure you want to delete this product?")) deleteProduct.mutate(product.id);
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
            <DialogTitle className="text-2xl font-display">{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Enterprise License" data-testid="input-product-name" className="rounded-xl border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Software" data-testid="input-product-category" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" data-testid="input-product-base-price" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit Cost ($) <span className="text-muted-foreground font-normal text-xs">— optional, used for margin analysis</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4000"
                        data-testid="input-product-cost"
                        className="rounded-xl border-border/60"
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description..." data-testid="input-product-description" className="rounded-xl border-border/60" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" data-testid="button-save-product" disabled={createProduct.isPending || updateProduct.isPending} className="rounded-xl shadow-md shadow-primary/20">
                  {createProduct.isPending || updateProduct.isPending ? "Saving..." : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
