import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: text("size").notNull(), // xlarge, large, medium, small
  region: text("region").notNull(), // East, Midwest, Southeast, Southwest
  email: text("email"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: numeric("base_price").notNull(),
  cost: numeric("cost"),
  category: text("category").notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
  totalAmount: numeric("total_amount").notNull().default('0'),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  priceMultiplier: numeric("price_multiplier").notNull().default('1'),
});

// === BASE SCHEMAS ===
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomerRequest = Partial<InsertCustomer>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProductRequest = Partial<InsertProduct>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type UpdateQuoteRequest = Partial<InsertQuote>;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type UpdateQuoteItemRequest = Partial<InsertQuoteItem>;
