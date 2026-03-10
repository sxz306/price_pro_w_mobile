import { z } from 'zod';
import { insertProductSchema, products, insertQuoteSchema, quotes, insertQuoteItemSchema, quoteItems } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  quotes: {
    list: {
      method: 'GET' as const,
      path: '/api/quotes' as const,
      responses: {
        200: z.array(z.custom<typeof quotes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/quotes/:id' as const,
      responses: {
        200: z.custom<typeof quotes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quotes' as const,
      input: insertQuoteSchema,
      responses: {
        201: z.custom<typeof quotes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/quotes/:id' as const,
      input: insertQuoteSchema.partial(),
      responses: {
        200: z.custom<typeof quotes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/quotes/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  quoteItems: {
    list: {
      method: 'GET' as const,
      path: '/api/quotes/:quoteId/items' as const,
      responses: {
        200: z.array(z.custom<typeof quoteItems.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quotes/:quoteId/items' as const,
      input: insertQuoteItemSchema.omit({ quoteId: true }),
      responses: {
        201: z.custom<typeof quoteItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/quotes/:quoteId/items/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
