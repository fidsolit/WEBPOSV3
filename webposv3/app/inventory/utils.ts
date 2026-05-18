import type {
  RecentDeliveryItem,
  InventoryItem,
  InventoryLossRow,
  InventoryRow,
  RecentInventoryHistoryItem,
  RecentLossItem,
  StockMovementRow,
} from "./types";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(Number(value ?? 0));
}

export function normalizeInventoryRows(rows: InventoryRow[]): InventoryItem[] {
  return rows.map((row) => ({
    id: row.id,
    stock: row.stock,
    min_stock: row.min_stock,
    products: Array.isArray(row.products) ? (row.products[0] ?? null) : row.products,
  }));
}

export function buildRecentLossItems(
  rows: InventoryLossRow[],
  productNameMap: Map<string, string>,
  variantNameMap: Map<string, string>,
  encodedByMap: Map<string, string | null>,
): RecentLossItem[] {
  return rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    reason: row.reason,
    created_at: row.created_at,
    item_name: row.product_id
      ? (productNameMap.get(row.product_id) ?? "Unknown product")
      : row.variant_id
        ? (variantNameMap.get(row.variant_id) ?? "Unknown variant")
        : "Unknown item",
    encoded_by: row.created_by
      ? (encodedByMap.get(row.created_by) ?? "Unknown user")
      : "System",
  }));
}

export function buildRecentDeliveryItems(
  rows: StockMovementRow[],
  productNameMap: Map<string, string>,
  encodedByMap: Map<string, string | null>,
): RecentDeliveryItem[] {
  return rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    unit_cost: row.unit_cost,
    note: row.note,
    created_at: row.created_at,
    item_name: row.product_id
      ? (productNameMap.get(row.product_id) ?? "Unknown product")
      : "Unknown item",
    encoded_by: row.created_by
      ? (encodedByMap.get(row.created_by) ?? "Unknown user")
      : "System",
  }));
}

export function buildRecentInventoryHistoryItems(
  rows: StockMovementRow[],
  productNameMap: Map<string, string>,
  encodedByMap: Map<string, string | null>,
): RecentInventoryHistoryItem[] {
  return rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    unit_cost: row.unit_cost,
    note: row.note,
    created_at: row.created_at,
    item_name: row.product_id
      ? (productNameMap.get(row.product_id) ?? "Unknown product")
      : "Unknown item",
    encoded_by: row.created_by
      ? (encodedByMap.get(row.created_by) ?? "Unknown user")
      : "System",
    movement_type: row.movement_type,
  }));
}
