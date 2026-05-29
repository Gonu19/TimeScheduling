import { describe, it, expect } from 'vitest';
import { encodeBitmask, decodeBitmask } from './bitmaskUtils';

describe('bitmaskUtils', () => {
  it('1. 인코딩 테스트: 정확한 십진수 Long(number) 비트마스크 값으로 인코딩되는지 검증', () => {
    // 48 slots false
    const slots = new Array(48).fill(false);
    
    // Choose slots 28, 29, 30, 31 (like Mon 14:00 to 16:00 if it was one day, but the requirement is just index array)
    slots[28] = true;
    slots[29] = true;
    slots[30] = true;
    slots[31] = true;

    // Expected value = 2^28 + 2^29 + 2^30 + 2^31
    const expected = Math.pow(2, 28) + Math.pow(2, 29) + Math.pow(2, 30) + Math.pow(2, 31);
    
    const result = encodeBitmask(slots);
    expect(result).toBe(expected);
  });

  it('2. 디코딩 테스트: 백엔드에서 받은 비트마스크 값이 렌더링할 타임 슬롯 배열로 디코딩되는지 검증', () => {
    // Expected value = 2^28 + 2^29 + 2^30 + 2^31
    const mask = Math.pow(2, 28) + Math.pow(2, 29) + Math.pow(2, 30) + Math.pow(2, 31);
    
    const decodedSlots = decodeBitmask(mask);
    
    expect(decodedSlots.length).toBe(48);
    // Verify only the selected slots are true
    for (let i = 0; i < 48; i++) {
      if (i >= 28 && i <= 31) {
        expect(decodedSlots[i]).toBe(true);
      } else {
        expect(decodedSlots[i]).toBe(false);
      }
    }
  });
});
