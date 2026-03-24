import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendQuoteEmail, getThreadReplies, getSenderEmail } from "./gmail";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === CUSTOMERS ===
  app.get(api.customers.list.path, async (req, res) => {
    const customerList = await storage.getCustomers();
    res.json(customerList);
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.customers.update.path, async (req, res) => {
    try {
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      res.json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.customers.delete.path, async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.status(204).send();
  });

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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  });

  app.patch(api.products.update.path, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
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
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json(quote);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    try {
      const input = api.quotes.create.input.parse(req.body);
      const quote = await storage.createQuote(input);
      res.status(201).json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.quotes.update.path, async (req, res) => {
    try {
      const input = api.quotes.update.input.parse(req.body);
      const quote = await storage.updateQuote(Number(req.params.id), input);
      if (!quote) return res.status(404).json({ message: 'Quote not found' });
      res.json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.quotes.delete.path, async (req, res) => {
    await storage.deleteQuote(Number(req.params.id));
    res.status(204).send();
  });

  // === QUOTE ITEMS ===
  app.get(api.quoteItems.listAll.path, async (req, res) => {
    const items = await storage.getAllQuoteItems();
    res.json(items);
  });

  app.get(api.quoteItems.list.path, async (req, res) => {
    const items = await storage.getQuoteItems(Number(req.params.quoteId));
    res.json(items);
  });

  app.post(api.quoteItems.create.path, async (req, res) => {
    try {
      const input = api.quoteItems.create.input.parse(req.body);
      const item = await storage.createQuoteItem({
        ...input,
        quoteId: Number(req.params.quoteId),
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.quoteItems.update.path, async (req, res) => {
    try {
      const input = api.quoteItems.update.input.parse(req.body);
      const item = await storage.updateQuoteItem(Number(req.params.id), input);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.quoteItems.delete.path, async (req, res) => {
    await storage.deleteQuoteItem(Number(req.params.id));
    res.status(204).send();
  });

  // === COMMUNICATIONS ===
  app.get(api.communications.list.path, async (req, res) => {
    const comms = await storage.getCommunications(Number(req.params.quoteId));
    res.json(comms);
  });

  app.post(api.communications.send.path, async (req, res) => {
    const quoteId = Number(req.params.quoteId);
    const quote = await storage.getQuote(quoteId);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (!quote.customerEmail) return res.status(400).json({ message: 'Customer has no email address' });

    const items = await storage.getQuoteItems(quoteId);
    const products = await storage.getProducts();

    const lineItemsHtml = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const mult = parseFloat(String(item.priceMultiplier || '1'));
      const linePrice = item.quantity * parseFloat(item.unitPrice) * mult;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${product?.name || 'Product #' + item.productId}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${linePrice.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const totalPrice = items.reduce((sum, item) => {
      const mult = parseFloat(String(item.priceMultiplier || '1'));
      return sum + item.quantity * parseFloat(item.unitPrice) * mult;
    }, 0);

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;">Quote #${quote.id} from Price Pro</h2>
        <p>Dear ${quote.customerName},</p>
        <p>Please find your quote details below:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Product</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px 8px;font-weight:bold;border-top:2px solid #333;">Total</td>
              <td style="padding:12px 8px;font-weight:bold;text-align:right;border-top:2px solid #333;">$${totalPrice.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p>If you have any questions, please reply to this email.</p>
        <p style="color:#666;font-size:12px;margin-top:30px;">Sent from Price Pro</p>
      </div>
    `;

    try {
      const subject = `Quote #${quote.id} — ${quote.customerName}`;
      const senderEmail = await getSenderEmail();
      const result = await sendQuoteEmail(quote.customerEmail, subject, htmlBody);

      await storage.createCommunication({
        quoteId,
        direction: 'outbound',
        senderEmail,
        recipientEmail: quote.customerEmail,
        subject,
        body: htmlBody,
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
      });

      if (quote.status === 'draft') {
        await storage.updateQuote(quoteId, { status: 'sent' });
      }

      res.json({ message: 'Quote sent successfully' });
    } catch (err: any) {
      console.error('Failed to send email:', err);
      res.status(500).json({ message: 'Failed to send email. Please check your Gmail connection.' });
    }
  });

  app.post(api.communications.syncReplies.path, async (req, res) => {
    const quoteId = Number(req.params.quoteId);
    const threadId = await storage.getLatestThreadId(quoteId);
    if (!threadId) return res.json({ newReplies: 0 });

    try {
      const replies = await getThreadReplies(threadId);
      const existingComms = await storage.getCommunications(quoteId);
      const existingIds = new Set(existingComms.map(c => c.gmailMessageId));

      let newCount = 0;
      for (const reply of replies) {
        if (!existingIds.has(reply.id)) {
          await storage.createCommunication({
            quoteId,
            direction: reply.isSender ? 'outbound' : 'inbound',
            senderEmail: reply.from,
            recipientEmail: '',
            subject: reply.subject || '',
            body: reply.snippet || reply.body,
            gmailMessageId: reply.id,
            gmailThreadId: threadId,
          });
          newCount++;
        }
      }

      res.json({ newReplies: newCount });
    } catch (err: any) {
      console.error('Failed to sync replies:', err);
      res.status(500).json({ message: 'Failed to sync replies. Please try again.' });
    }
  });

  // SEED DATA
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    console.log("Seeding products...");
    const p1 = await storage.createProduct({ name: "Stocked Powder A", description: null, basePrice: "12.00", cost: "12.00", category: "Stocked Powder" });
    const p2 = await storage.createProduct({ name: "Stocked Powder B", description: null, basePrice: "8.00", cost: "8.00", category: "Stocked Powder" });
    const p3 = await storage.createProduct({ name: "Non Stocked Powder C", description: null, basePrice: "6.00", cost: "6.00", category: "Non Stocked" });
    const p4 = await storage.createProduct({ name: "Non Stocked Powder D", description: null, basePrice: "10.00", cost: "10.00", category: "Non Stocked" });

    console.log("Seeding quotes...");
    const q1 = await storage.createQuote({ customerName: "Acme Corp", customerEmail: "procurement@acmecorp.example.com", status: "draft" });
    const q2 = await storage.createQuote({ customerName: "Globex Industries", customerEmail: "billing@globex.example.com", status: "sent" });

    await storage.createQuoteItem({ quoteId: q1.id, productId: p1.id, quantity: 2, unitPrice: "12.00" });
    await storage.createQuoteItem({ quoteId: q1.id, productId: p3.id, quantity: 1, unitPrice: "6.00" });
    await storage.createQuoteItem({ quoteId: q2.id, productId: p2.id, quantity: 3, unitPrice: "8.00" });
    await storage.createQuoteItem({ quoteId: q2.id, productId: p4.id, quantity: 1, unitPrice: "10.00" });
  }
}
