package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import com.example.timescheduling.domain.Session;
import com.example.timescheduling.dto.RecommendationResponse;
import com.example.timescheduling.exception.CustomApiException;
import com.example.timescheduling.exception.ResourceNotFoundException;

import com.example.timescheduling.repository.SessionRepository;


@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ScheduleRecommendationService {

    private final ParticipantScheduleRepository participantScheduleRepository;
    private final SessionRepository sessionRepository;
    private final MeetingCalculationStrategy meetingStrategy;
    private final WorkCalculationStrategy workStrategy;

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
     * API 3.1 용 추천 스케줄 리스트 도출 (MEETING)
     */
    public List<RecommendationResponse> getRecommendations(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        if (!"MEETING".equalsIgnoreCase(session.getPurpose())) {
            throw new CustomApiException("ERR_INVALID_DOMAIN_REQUEST", "해당 세션은 근무(WORK) 도메인이므로 API 3.3 엔드포인트를 사용해야 합니다.", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        
        List<RecommendationResponse> base = meetingStrategy.calculate(session, schedules);
        Integer maxVersionRaw = participantScheduleRepository.findMaxVersionBySessionId(sessionId);
        long maxVersion = maxVersionRaw != null ? maxVersionRaw.longValue() : 0L;
        return base.stream().map(r -> new RecommendationResponse(r.rank(), r.type(), r.date(), r.startTime(), r.endTime(), r.attendeesCount(), r.attendees(), maxVersion)).toList();
    }

    /**
     * API 3.3 용 추천 스케줄 리스트 도출 (WORK)
     */
    public List<com.example.timescheduling.dto.WorkRecommendationResponse> getWorkRecommendations(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        if (!"WORK".equalsIgnoreCase(session.getPurpose())) {
            throw new CustomApiException("ERR_INVALID_DOMAIN_REQUEST", "해당 세션은 회의(MEETING) 도메인이므로 API 3.1 엔드포인트를 사용해야 합니다.", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        
        List<com.example.timescheduling.dto.WorkRecommendationResponse> base = workStrategy.calculate(session, schedules);
        Integer maxVersionRaw = participantScheduleRepository.findMaxVersionBySessionId(sessionId);
        long maxVersion = maxVersionRaw != null ? maxVersionRaw.longValue() : 0L;
        return base.stream().map(r -> new com.example.timescheduling.dto.WorkRecommendationResponse(r.rank(), r.totalCoverage(), r.weeklyPlan(), maxVersion)).toList();
    }
}
