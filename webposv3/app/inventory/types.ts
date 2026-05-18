export interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string | null;
}

export interface InventoryItem {
  id: string;
  stock: number;
  min_stock?: number;
  products: InventoryProduct | null;
}

export interface InventoryRow {
  id: string;
  stock: number;
  min_stock?: number;
  products: InventoryProduct | InventoryProduct[] | null;
}

export interface ProductOption {
  id: string;
  name: string;
}

export interface RecentLossItem {
  id: string;
  quantity: number;
  reason: string;
  created_at: string;
  item_name: string;
  encoded_by: string;
}

export interface InventoryLossRow {
  id: string;
  quantity: number;
  reason: string;
  created_at: string;
  product_id: string | null;
  variant_id: string | null;
  created_by: string | null;
}

export interface NewItemFormState {
  name: string;
  barcode: string;
  stock: string;
  minStock: string;
  price: string;
  cost: string;
}

export interface VariantFormState {
  productId: string;
  name: string;
  price: string;
  barcode: string;
  openingStock: string;
}

export interface LossFormState {
  productId: string;
  quantity: string;
  reason: string;
}
