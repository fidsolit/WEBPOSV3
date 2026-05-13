import type {
  LossFormState,
  NewItemFormState,
  VariantFormState,
} from "./types";

export const DEFAULT_NEW_ITEM_FORM: NewItemFormState = {
  name: "",
  barcode: "",
  stock: "",
  price: "",
  cost: "",
};

export const DEFAULT_VARIANT_FORM: VariantFormState = {
  productId: "",
  name: "",
  price: "",
  barcode: "",
  openingStock: "",
};

export const DEFAULT_LOSS_FORM: LossFormState = {
  productId: "",
  quantity: "",
  reason: "",
};
