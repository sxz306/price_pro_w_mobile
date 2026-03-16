import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === PRODUCTS ===
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  });

  app.patch(api.products.update.path, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  // === QUOTES ===
  app.get(api.quotes.list.path, async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.get(api.quotes.get.path, async (req, res) => {
    const quote = await storage.getQuote(Number(req.params.id));
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    res.json(quote);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    try {
      const input = api.quotes.create.input.parse(req.body);
      const quote = await storage.createQuote(input);
      res.status(201).json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.quotes.update.path, async (req, res) => {
    try {
      const input = api.quotes.update.input.parse(req.body);
      const quote = await storage.updateQuote(Number(req.params.id), input);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      res.json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.quotes.delete.path, async (req, res) => {
    await storage.deleteQuote(Number(req.params.id));
    res.status(204).send();
  });

  // === QUOTE ITEMS ===
  app.get(api.quoteItems.list.path, async (req, res) => {
    const items = await storage.getQuoteItems(Number(req.params.quoteId));
    res.json(items);
  });

  app.post(api.quoteItems.create.path, async (req, res) => {
    try {
      const input = api.quoteItems.create.input.parse(req.body);
      // Construct item with URL param quoteId
      const itemToCreate = {
        ...input,
        quoteId: Number(req.params.quoteId),
      };
      
      const item = await storage.createQuoteItem(itemToCreate);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.quoteItems.delete.path, async (req, res) => {
    await storage.deleteQuoteItem(Number(req.params.id));
    res.status(204).send();
  });

  // SEED DATA
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    console.log("Seeding products...");
    const p1 = await storage.createProduct({
      name: "Enterprise Software License",
      description: "Annual license for up to 100 users",
      basePrice: "12000.00",
      cost: "6500.00",
      category: "Software"
    });
    
    const p2 = await storage.createProduct({
      name: "Implementation Consulting",
      description: "Dedicated project manager and deployment services",
      basePrice: "5000.00",
      cost: "2800.00",
      category: "Services"
    });
    
    const p3 = await storage.createProduct({
      name: "Premium Support SLA",
      description: "24/7 phone support and 1hr response time",
      basePrice: "2500.00",
      cost: "900.00",
      category: "Support"
    });

    console.log("Seeding quotes...");
    const q1 = await storage.createQuote({
      customerName: "Acme Corp",
      customerEmail: "procurement@acmecorp.example.com",
      status: "draft"
    });
    
    const q2 = await storage.createQuote({
      customerName: "Globex Industries",
      customerEmail: "billing@globex.example.com",
      status: "sent"
    });
    
    await storage.createQuoteItem({
      quoteId: q1.id,
      productId: p1.id,
      quantity: 1,
      unitPrice: "12000.00"
    });
    
    await storage.createQuoteItem({
      quoteId: q1.id,
      productId: p2.id,
      quantity: 1,
      unitPrice: "4500.00" // discount applied
    });
    
    await storage.createQuoteItem({
      quoteId: q2.id,
      productId: p1.id,
      quantity: 5,
      unitPrice: "11000.00" // bulk discount
    });
    
    await storage.createQuoteItem({
      quoteId: q2.id,
      productId: p3.id,
      quantity: 1,
      unitPrice: "2500.00"
    });
  }
}
