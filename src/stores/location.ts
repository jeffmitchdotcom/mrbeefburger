import { persistentAtom } from '@nanostores/persistent';

export type SelectedLocation = {
  slug: string;
  name: string;
  address: string;
};

export const $orderLocation = persistentAtom<SelectedLocation | null>('mrb-order-location', null, {
  encode: JSON.stringify,
  decode: (v) => (v ? JSON.parse(v) : null),
});

export function setOrderLocation(loc: SelectedLocation) {
  $orderLocation.set(loc);
}

export function clearOrderLocation() {
  $orderLocation.set(null);
}
