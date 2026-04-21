export type Customer = {
  id: number;
  name: string;
  size: string;
  region: string;
  email: string | null;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  cost: string | null;
  category: string;
};

export type Quote = {
  id: number;
  customerId: number | null;
  customerName: string;
  customerEmail: string | null;
  status: string;
  createdAt: string | null;
  totalAmount: string;
};

export type QuoteItem = {
  id: number;
  quoteId: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  priceMultiplier: string;
};

export type Communication = {
  id: number;
  quoteId: number;
  direction: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  gmailMessageId: string | null;
  gmailThreadId: string | null;
  sentAt: string | null;
};
