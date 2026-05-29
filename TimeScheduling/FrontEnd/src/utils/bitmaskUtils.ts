export function encodeBitmask(slots: boolean[]): number {
  if (!slots || slots.length !== 48) {
    throw new Error("Slots array must be exactly 48 in length.");
  }
  let mask = 0;
  for (let i = 0; i < 48; i++) {
    if (slots[i]) {
      mask += Math.pow(2, i);
    }
  }
  return mask;
}

export function decodeBitmask(mask: number): boolean[] {
  const slots = new Array(48).fill(false);
  let current = mask;
  for (let i = 0; i < 48; i++) {
    slots[i] = current % 2 !== 0;
    current = Math.floor(current / 2);
  }
  return slots;
}
