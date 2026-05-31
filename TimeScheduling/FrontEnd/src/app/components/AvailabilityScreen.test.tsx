import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvailabilityScreen } from './AvailabilityScreen';
import { toast } from 'sonner';

// sonner 라이브러리의 toast 모킹
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

describe('AvailabilityScreen Component', () => {
  it('예외 상황 렌더링 테스트: 0개의 슬롯을 선택한 상태에서 제출 시 에러 Toast 메시지 발생 검증', () => {
    const onSubmit = vi.fn();
    const onGoDashboard = vi.fn();

    // Mock Session Data
    const mockSession = {
      id: 'session-123',
      title: '테스트 세션',
      domainType: 'MEETING' as const,
      status: 'OPEN' as const,
      members: [
        { memberId: 1, name: '테스터1', role: '참여자', isMandatory: false, hasSubmitted: false }
      ],
      dates: ['2026-05-27'],
      createdAt: Date.now()
    };

    render(
      <AvailabilityScreen 
        session={mockSession} 
        submissions={[]} 
        onSubmit={onSubmit} 
        onGoDashboard={onGoDashboard} 
      />
    );

    // 1. 멤버 선택 화면에서 멤버를 클릭하여 시간 입력 화면으로 이동
    const memberButton = screen.getByText('테스터1');
    fireEvent.click(memberButton);

    // 2. 아무 타임 슬롯도 선택하지 않은 상태에서 바로 제출 버튼 클릭
    const submitButton = screen.getByText('내 가용시간 저장하기');
    fireEvent.click(submitButton);

    // 3. 검증 로직
    // 정상 제출(onSubmit) 로직이 호출되지 않아야 함
    expect(onSubmit).not.toHaveBeenCalled();
    
    // 화면(UI)에 에러 메시지를 띄우는 toast.error가 호출되어야 함
    expect(toast.error).toHaveBeenCalledWith('가용 시간을 한 칸 이상 선택해주세요.');
  });
});
