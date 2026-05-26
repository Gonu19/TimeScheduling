package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleRecommendationService {

    private final ParticipantScheduleRepository participantScheduleRepository;

    /**
     * 1. 전원 참석 교집합 (Perfect Match)
     * 해당 세션의 전체 팀원 데이터를 Bitwise AND 연산하여 
     * 모두가 참석할 수 있는 타임 슬롯을 추출합니다.
     */
    public long[] getPerfectMatch(String sessionId) {
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        
        if (schedules.isEmpty()) {
            return new long[]{0L, 0L, 0L, 0L, 0L, 0L, 0L};
        }

        long[] result = new long[7];
        // 초깃값을 모두 1로 설정 (64 bits)
        for (int i = 0; i < 7; i++) {
            result[i] = ~0L; 
        }

        for (ParticipantSchedule ps : schedules) {
            result[0] &= ps.getBitmask0();
            result[1] &= ps.getBitmask1();
            result[2] &= ps.getBitmask2();
            result[3] &= ps.getBitmask3();
            result[4] &= ps.getBitmask4();
            result[5] &= ps.getBitmask5();
            result[6] &= ps.getBitmask6();
        }

        // 실제 사용되는 48-bit (하루 30분 단위 = 48개 슬롯)만 남기도록 Masking 처리
        long mask48 = (1L << 48) - 1;
        for (int i = 0; i < 7; i++) {
            result[i] &= mask48;
        }

        return result;
    }

    /**
     * 2. 필참 멤버 교집합 (Mandatory Match)
     * isMandatory == true 인 핵심 팀원들의 데이터만 필터링하여
     * Bitwise AND 연산 수행
     */
    public long[] getMandatoryMatch(String sessionId) {
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        
        List<ParticipantSchedule> mandatorySchedules = schedules.stream()
                .filter(ps -> ps.getParticipant().isMandatory())
                .toList();

        if (mandatorySchedules.isEmpty()) {
            return new long[]{0L, 0L, 0L, 0L, 0L, 0L, 0L};
        }

        long[] result = new long[7];
        for (int i = 0; i < 7; i++) {
            result[i] = ~0L;
        }

        for (ParticipantSchedule ps : mandatorySchedules) {
            result[0] &= ps.getBitmask0();
            result[1] &= ps.getBitmask1();
            result[2] &= ps.getBitmask2();
            result[3] &= ps.getBitmask3();
            result[4] &= ps.getBitmask4();
            result[5] &= ps.getBitmask5();
            result[6] &= ps.getBitmask6();
        }

        long mask48 = (1L << 48) - 1;
        for (int i = 0; i < 7; i++) {
            result[i] &= mask48;
        }

        return result;
    }

    /**
     * Helper Method: 비트 인덱스를 실제 시간 (00:00 ~ 23:30) 문자열로 변환 (Decoding)
     */
    public String decodeIndexToTime(int bitIndex) {
        if (bitIndex < 0 || bitIndex > 47) {
            throw new IllegalArgumentException("유효하지 않은 비트 인덱스입니다. (0 ~ 47 허용): " + bitIndex);
        }
        int hour = bitIndex / 2;
        int minute = (bitIndex % 2) * 30;
        return String.format("%02d:%02d", hour, minute);
    }

    /**
     * Helper Method: 단일 48-bit Long 데이터에서 활성화된(1) 모든 시간대 리스트 추출
     */
    public List<String> extractActiveTimes(long bitmask) {
        List<String> activeTimes = new ArrayList<>();
        for (int i = 0; i < 48; i++) {
            // (1L << i) 와의 비트 논리곱(&) 연산을 통해 해당 슬롯이 활성화되었는지 판단
            if ((bitmask & (1L << i)) != 0L) {
                activeTimes.add(decodeIndexToTime(i));
            }
        }
        return activeTimes;
    }
}
