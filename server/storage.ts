import { db } from "./db";
import {
  customers, products, quotes, quoteItems,
  type Customer, type InsertCustomer, type UpdateCustomerRequest,
  type Product, type InsertProduct, type UpdateProductRequest,
  type Quote, type InsertQuote, type UpdateQuoteRequest,
  type QuoteItem, type InsertQuoteItem
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: UpdateCustomerRequest): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, updates: UpdateQuoteRequest): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<void>;

  // Quote Items
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;
  updateQuoteTotal(quoteId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, updates: UpdateCustomerRequest): Promise<Customer | undefined> {
    const [updated] = await db.update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Quotes
  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(quotes.createdAt);
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: number, updates: UpdateQuoteRequest): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes)
      .set(updates)
      .where(eq(quotes.id, id))
      .returning();
    return updated;
  }

  async deleteQuote(id: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Quote Items
  async getQuoteItems(quoteId: number): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db.insert(quoteItems).values(item).returning();
    await this.updateQuoteTotal(item.quoteId);
    return newItem;
  }

  async deleteQuoteItem(id: number): Promise<void> {
    const [item] = await db.select().from(quoteItems).where(eq(quoteItems.id, id));
    if (item) {
      await db.delete(quoteItems).where(eq(quoteItems.id, id));
      await this.updateQuoteTotal(item.quoteId);
    }
  }

  async updateQuoteTotal(quoteId: number): Promise<void> {
    const items = await this.getQuoteItems(quoteId);
    const total = items.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unitPrice));
    }, 0);

    await db.update(quotes)
      .set({ totalAmount: total.toString() })
      .where(eq(quotes.id, quoteId));
  }
}

export const storage = new DatabaseStorage();
