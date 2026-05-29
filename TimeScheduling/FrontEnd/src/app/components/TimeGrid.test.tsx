import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TimeGrid } from './TimeGrid';

describe('TimeGrid Component', () => {
  it('드래그 UI 테스트: MouseDown -> MouseEnter를 통해 드래그한 영역이 "선택됨"으로 변하는지 확인', () => {
    const onChange = vi.fn();
    const columns = [
      { key: '2026-05-27', top: '5/27', bot: '수' },
      { key: '2026-05-28', top: '5/28', bot: '목' }
    ];
    // 2 columns, 48 slots initialized to false
    const value = [
      new Array(48).fill(false),
      new Array(48).fill(false),
    ];

    const { container } = render(
      <TimeGrid columns={columns} value={value} onChange={onChange} />
    );

    // .cursor-pointer 클래스를 가진 요소들이 클릭/드래그 가능한 타임 셀들입니다.
    const cells = container.querySelectorAll('.cursor-pointer');
    
    // 총 셀 개수는 2(열) * 48(행) = 96개
    expect(cells.length).toBe(96);

    // 셀 렌더링 순서는 행 단위(slot)로 진행됩니다.
    // cell[0] => col 0, slot 0
    // cell[1] => col 1, slot 0
    // cell[2] => col 0, slot 1

    // 1. 첫 번째 셀(col 0, slot 0)에서 마우스를 누릅니다 (MouseDown)
    fireEvent.mouseDown(cells[0]);

    // 첫 번째 onChange 호출 검증 (해당 셀이 true가 되는 배열 반환)
    expect(onChange).toHaveBeenCalledTimes(1);
    let nextValue = onChange.mock.calls[0][0];
    expect(nextValue[0][0]).toBe(true);

    // 드래그 상태를 반영하기 위해 내부적으로 value가 업데이트되었다고 가정하고,
    // 테스트 환경에서는 onEnter가 이전 onChange에 의해 업데이트된 props를 모를 수 있으므로
    // 컴포넌트 내부의 dragging 상태를 이용해 덮어씌워지는지 확인합니다.
    // onChange가 호출되었으므로 바로 다시 render를 트리거해야 정확하지만, 
    // TimeGrid 내부 state(dragging.mode)가 작동하여 다음 셀 진입 시에도 올바르게 동작하는지 확인합니다.

    // 2. 같은 열의 다음 슬롯(col 0, slot 1)으로 마우스를 이동합니다 (MouseEnter)
    fireEvent.mouseEnter(cells[2]);
    
    expect(onChange).toHaveBeenCalledTimes(2);
    
    // 두 번째 호출의 인자 검증
    nextValue = onChange.mock.calls[1][0];
    expect(nextValue[0][1]).toBe(true);
    
    // MouseUp으로 드래그를 종료 (이후 MouseEnter는 무시되어야 함)
    fireEvent.mouseUp(window);
    fireEvent.mouseEnter(cells[4]); // col 0, slot 2
    
    // onChange 호출 횟수가 늘어나지 않아야 합니다.
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
