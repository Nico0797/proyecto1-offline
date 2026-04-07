import { create } from 'zustand';
import { Quote, QuoteStatus } from '../types';
import { quotesService, QuoteConvertPayload, QuoteFilters, QuotePayload } from '../services/quotesService';

interface QuoteState {
  quotes: Quote[];
  selectedQuote: Quote | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchQuotes: (businessId: number, filters?: QuoteFilters) => Promise<void>;
  fetchQuote: (businessId: number, quoteId: number) => Promise<Quote | null>;
  createQuote: (businessId: number, payload: QuotePayload) => Promise<Quote>;
  updateQuote: (businessId: number, quoteId: number, payload: QuotePayload) => Promise<Quote>;
  deleteQuote: (businessId: number, quoteId: number) => Promise<void>;
  updateQuoteStatus: (businessId: number, quoteId: number, status: QuoteStatus) => Promise<Quote>;
  convertQuoteToSale: (businessId: number, quoteId: number, payload: QuoteConvertPayload) => Promise<{ quote: Quote; sale: any }>;
  setSelectedQuote: (quote: Quote | null) => void;
}

const upsertQuote = (quotes: Quote[], quote: Quote) => {
  const exists = quotes.some((item) => item.id === quote.id);
  if (!exists) return [quote, ...quotes];
  return quotes.map((item) => (item.id === quote.id ? quote : item));
};

export const useQuoteStore = create<QuoteState>((set) => ({
  quotes: [],
  selectedQuote: null,
  loading: false,
  saving: false,
  error: null,

  fetchQuotes: async (businessId, filters) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ quotes: [], loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const quotes = await quotesService.list(businessId, filters);
      set({ quotes });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchQuote: async (businessId, quoteId) => {
    set({ loading: true, error: null });
    try {
      const quote = await quotesService.get(businessId, quoteId);
      set((state) => ({
        selectedQuote: quote,
        quotes: upsertQuote(state.quotes, quote),
      }));
      return quote;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createQuote: async (businessId, payload) => {
    set({ saving: true, error: null });
    try {
      const quote = await quotesService.create(businessId, payload);
      set((state) => ({
        quotes: [quote, ...state.quotes],
        selectedQuote: quote,
      }));
      return quote;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateQuote: async (businessId, quoteId, payload) => {
    set({ saving: true, error: null });
    try {
      const quote = await quotesService.update(businessId, quoteId, payload);
      set((state) => ({
        quotes: upsertQuote(state.quotes, quote),
        selectedQuote: quote,
      }));
      return quote;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  deleteQuote: async (businessId, quoteId) => {
    set({ saving: true, error: null });
    try {
      await quotesService.remove(businessId, quoteId);
      set((state) => ({
        quotes: state.quotes.filter((quote) => quote.id !== quoteId),
        selectedQuote: state.selectedQuote?.id === quoteId ? null : state.selectedQuote,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateQuoteStatus: async (businessId, quoteId, status) => {
    set({ saving: true, error: null });
    try {
      const quote = await quotesService.updateStatus(businessId, quoteId, status);
      set((state) => ({
        quotes: upsertQuote(state.quotes, quote),
        selectedQuote: state.selectedQuote?.id === quote.id ? quote : state.selectedQuote,
      }));
      return quote;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  convertQuoteToSale: async (businessId, quoteId, payload) => {
    set({ saving: true, error: null });
    try {
      const result = await quotesService.convertToSale(businessId, quoteId, payload);
      set((state) => ({
        quotes: upsertQuote(state.quotes, result.quote),
        selectedQuote: result.quote,
      }));
      return result;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedQuote: (quote) => set({ selectedQuote: quote }),
}));
