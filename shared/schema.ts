import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: numeric("base_price").notNull(),
  category: text("category").notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default('draft'), // draft, sent, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
  totalAmount: numeric("total_amount").notNull().default('0'),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
});

// === BASE SCHEMAS ===
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type CreateQuoteRequest = InsertQuote;
export type UpdateQuoteRequest = Partial<InsertQuote>;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type CreateQuoteItemRequest = InsertQuoteItem;
export type UpdateQuoteItemRequest = Partial<InsertQuoteItem>;
