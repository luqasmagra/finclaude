export interface Account {
  id: string;
  name: string;
  type: 'digital' | 'bank' | 'cash';
  currency: 'ARS' | 'USD';
  balance: number;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  category_id: string | null;
  date: string;
  source: 'manual' | 'import' | 'mercadopago';
  external_id?: string;
  created_at: string;
  accounts?: { name: string };
  categories?: { name: string; color: string; icon: string };
}

export interface Conversation {
  role: 'user' | 'assistant' | 'summary';
  content: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  type: 'transaction' | 'query' | 'clarification' | 'error';
  message: string;
  transaction?: Transaction;
}