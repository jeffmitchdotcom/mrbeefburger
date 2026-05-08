import { persistentAtom } from '@nanostores/persistent';

export type CartItem = {
  slug: string;
  title: string;
  price: number;
  quantity: number;
  customizations: string[];
};

export const cartItems = persistentAtom<CartItem[]>('mrb-cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function addToCart(item: CartItem) {
  const current = cartItems.get();
  const existing = current.find(
    (i) =>
      i.slug === item.slug &&
      JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
  );
  if (existing) {
    cartItems.set(
      current.map((i) =>
        i === existing ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  } else {
    cartItems.set([...current, item]);
  }
}

export function removeFromCart(index: number) {
  cartItems.set(cartItems.get().filter((_, i) => i !== index));
}

export function clearCart() {
  cartItems.set([]);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
