export type PaymentMethod = "efectivo" | "yappy" | "transferencia" | "tarjeta" | "pedidos_ya"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yappy", label: "Yappy" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta de crédito" },
  { value: "pedidos_ya", label: "PedidosYa" },
]

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  yappy: "Yappy",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta de crédito",
  pedidos_ya: "PedidosYa",
}

export interface Sale {
  id: string
  origin: string | null
  user_id: string
  subtotal: number
  discount: number | null
  total: number
  payment_method: string
  reference_number: string | null
  notes: string | null
  receipt_number: string | null
  created_at: string
  profiles?: { name: string } | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  discount: number | null
  subtotal: number
}

export interface Product {
  id: string
  name: string
  price: number
  factory_stock: number
  store_stock: number
  unit: string
  active: boolean
  is_plan: boolean
  category: string
}

export type ActionState = { success?: string; error?: string; sale_id?: string } | null

export interface SalePayloadItem {
  product_id: string | null
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  is_plan: boolean
  plan_products?: { product_id: string; quantity: number }[]
}

export interface SalePayload {
  items: SalePayloadItem[]
  global_discount: number
  payment_method: string
  reference_number: string | null
  notes: string | null
}
