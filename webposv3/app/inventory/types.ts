export type ProductType = "product" | "service";

export interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string | null;
  product_type?: ProductType;
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
  barcode?: string | null;
  product_type?: ProductType;
}

export interface RecentLossItem {
  id: string;
  quantity: number;
  reason: string;
  created_at: string;
  item_name: string;
  encoded_by: string;
}

export interface RecentDeliveryItem {
  id: string;
  quantity: number;
  unit_cost: number | null;
  note: string | null;
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

export interface StockMovementRow {
  id: string;
  quantity: number;
  unit_cost: number | null;
  note: string | null;
  created_at: string;
  product_id: string | null;
  created_by: string | null;
  movement_type: "sale" | "restock" | "adjustment" | "transfer_in" | "transfer_out" | "void_restore";
  reference_type?: string | null;
}

export interface RecentInventoryHistoryItem {
  id: string;
  quantity: number;
  unit_cost: number | null;
  note: string | null;
  created_at: string;
  item_name: string;
  encoded_by: string;
  movement_type: StockMovementRow["movement_type"];
}

export interface NewItemFormState {
  productType: ProductType;
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

export interface DeliveryFormState {
  productId: string;
  quantity: string;
  unitCost: string;
  supplierName: string;
  referenceNumber: string;
  note: string;
}
