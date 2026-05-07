export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  factory_stock: number;
  store_stock: number;
  active: boolean;
}

export interface Movement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  origin: string | null;
  destination: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  products: { name: string } | null;
}

export type ActionState = {
  success?: string;
  error?: string;
} | null;

export const TYPE_LABELS: Record<string, string> = {
  entry: "Entrada",
  transfer: "Traslado",
  damage: "Dañado",
  expiry: "Vencido",
  gift: "Regalía",
  sale: "Venta",
};

export const ORIGIN_LABELS: Record<string, string> = {
  factory: "Fábrica",
  store: "Tienda",
};

export interface MovementWithUser {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  origin: string | null;
  destination: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  profiles: { name: string } | null;
}
