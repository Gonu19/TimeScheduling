package com.example.timescheduling.service;

import com.example.timescheduling.domain.Participant;
import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import com.example.timescheduling.repository.SessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleRecommendationServiceTest {

    @Mock
    private ParticipantScheduleRepository participantScheduleRepository;

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private ScheduleRecommendationService scheduleRecommendationService;

    @Test
    @DisplayName("1. 전원 참석 교집합 성공 - 3명의 팀원이 특정 시간에 모두 가용할 때")
    void perfectMatchSuccess() {
        // Given
        String sessionId = "test-session";
        
        // Member 1: Available at bit 2 and 3
        Participant p1 = Participant.builder().nickname("User1").isMandatory(false).build();
        ParticipantSchedule ps1 = ParticipantSchedule.builder().participant(p1).build();
        ps1.updateBitmasks((1L << 2) | (1L << 3), 0L, 0L, 0L, 0L, 0L, 0L);

        // Member 2: Available at bit 3 and 4
        Participant p2 = Participant.builder().nickname("User2").isMandatory(false).build();
        ParticipantSchedule ps2 = ParticipantSchedule.builder().participant(p2).build();
        ps2.updateBitmasks((1L << 3) | (1L << 4), 0L, 0L, 0L, 0L, 0L, 0L);

        // Member 3: Available at bit 1, 3, 5
        Participant p3 = Participant.builder().nickname("User3").isMandatory(false).build();
        ParticipantSchedule ps3 = ParticipantSchedule.builder().participant(p3).build();
        ps3.updateBitmasks((1L << 1) | (1L << 3) | (1L << 5), 0L, 0L, 0L, 0L, 0L, 0L);

        when(participantScheduleRepository.findAllBySessionId(sessionId))
                .thenReturn(List.of(ps1, ps2, ps3));

        // When
        long[] result = scheduleRecommendationService.getPerfectMatch(sessionId);

        // Then
        // The only common bit is bit 3
        assertThat(result[0]).isEqualTo(1L << 3);
        for (int i = 1; i < 7; i++) {
            assertThat(result[i]).isEqualTo(0L);
        }
    }

    @Test
    @DisplayName("2. 교집합 0 - 아무도 안 겹침")
    void perfectMatchZeroIntersection() {
        // Given
        String sessionId = "test-session";
        
        // Member 1: Available only at bit 0
        Participant p1 = Participant.builder().nickname("User1").isMandatory(false).build();
        ParticipantSchedule ps1 = ParticipantSchedule.builder().participant(p1).build();
        ps1.updateBitmasks(1L, 0L, 0L, 0L, 0L, 0L, 0L);

        // Member 2: Available only at bit 1
        Participant p2 = Participant.builder().nickname("User2").isMandatory(false).build();
        ParticipantSchedule ps2 = ParticipantSchedule.builder().participant(p2).build();
        ps2.updateBitmasks(1L << 1, 0L, 0L, 0L, 0L, 0L, 0L);

        when(participantScheduleRepository.findAllBySessionId(sessionId))
                .thenReturn(List.of(ps1, ps2));

        // When
        long[] result = scheduleRecommendationService.getPerfectMatch(sessionId);

        // Then
        for (int i = 0; i < 7; i++) {
            assertThat(result[i]).isEqualTo(0L);
        }
    }

    @Test
    @DisplayName("3. 필참 멤버(Mandatory) 우선 연산")
    void mandatoryMatchPrecedence() {
        // Given
        String sessionId = "test-session";

        // Mandatory Member: Available at bit 10
        Participant pMandatory = Participant.builder().nickname("MandatoryUser").isMandatory(true).build();
        ParticipantSchedule psMandatory = ParticipantSchedule.builder().participant(pMandatory).build();
        psMandatory.updateBitmasks(1L << 10, 0L, 0L, 0L, 0L, 0L, 0L);

        // Regular Member 1: Available at bit 5
        Participant pRegular1 = Participant.builder().nickname("RegularUser1").isMandatory(false).build();
        ParticipantSchedule psRegular1 = ParticipantSchedule.builder().participant(pRegular1).build();
        psRegular1.updateBitmasks(1L << 5, 0L, 0L, 0L, 0L, 0L, 0L);

        // Regular Member 2: Available at bit 10 and 15
        Participant pRegular2 = Participant.builder().nickname("RegularUser2").isMandatory(false).build();
        ParticipantSchedule psRegular2 = ParticipantSchedule.builder().participant(pRegular2).build();
        psRegular2.updateBitmasks((1L << 10) | (1L << 15), 0L, 0L, 0L, 0L, 0L, 0L);

        // getMandatoryMatch should ONLY consider pMandatory.
        // Therefore, it should return bit 10.
        // Wait, the repository will return all schedules. 
        // The service will filter by isMandatory() == true.
        when(participantScheduleRepository.findAllBySessionId(sessionId))
                .thenReturn(List.of(psMandatory, psRegular1, psRegular2));

        // When
        long[] result = scheduleRecommendationService.getMandatoryMatch(sessionId, null);

        // Then
        // Only the mandatory user's availability (bit 10) should be considered.
        assertThat(result[0]).isEqualTo(1L << 10);
        for (int i = 1; i < 7; i++) {
            assertThat(result[i]).isEqualTo(0L);
        }
    }

    @Test
    @DisplayName("4. 시간 디코딩(Decoding) 경계값 테스트 - 최상단(00:00)과 최하단(23:30)")
    void timeDecodingBoundaries() {
        // Given
        // bit 0 -> 00:00
        // bit 47 -> 23:30
        long boundaryBitmask = (1L) | (1L << 47);

        // When
        List<String> activeTimes = scheduleRecommendationService.extractActiveTimes(boundaryBitmask);

        // Then
        assertThat(activeTimes).hasSize(2);
        assertThat(activeTimes.get(0)).isEqualTo("00:00");
        assertThat(activeTimes.get(1)).isEqualTo("23:30");
    }
}