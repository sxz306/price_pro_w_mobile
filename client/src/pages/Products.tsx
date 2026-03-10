import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, PackageSearch } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Product } from "@shared/schema";

const productFormSchema = insertProductSchema.extend({
  basePrice: z.coerce.number().min(0, "Price must be positive"),
});

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      category: "",
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    form.reset({ name: "", description: "", basePrice: 0, category: "" });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      basePrice: parseFloat(product.basePrice),
      category: product.category,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof productFormSchema>) => {
    const payload = {
      ...values,
      basePrice: values.basePrice.toString(),
    };

    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, ...payload },
        { onSuccess: () => setIsFormOpen(false) }
      );
    } else {
      createProduct.mutate(payload, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const formatCurrency = (val: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your catalog and base pricing.</p>
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
                className="pl-9 rounded-xl bg-background border-border shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">Category</TableHead>
                  <TableHead className="font-semibold text-foreground hidden lg:table-cell">Description</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Base Price</TableHead>
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
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground flex-col items-center justify-center">
                      <PackageSearch className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No products found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground truncate max-w-xs">{product.description}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.basePrice)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(product)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => {
                            if(confirm("Are you sure you want to delete this product?")) deleteProduct.mutate(product.id);
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
                      <Input placeholder="e.g. Enterprise License" className="rounded-xl border-border/60" {...field} />
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
                        <Input placeholder="e.g. Software" className="rounded-xl border-border/60" {...field} />
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
                        <Input type="number" step="0.01" className="rounded-xl border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description..." className="rounded-xl border-border/60" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="rounded-xl shadow-md shadow-primary/20">
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
