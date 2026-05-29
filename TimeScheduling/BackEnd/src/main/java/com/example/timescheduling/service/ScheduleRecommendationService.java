package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.example.timescheduling.domain.Session;
import com.example.timescheduling.repository.SessionRepository;
import com.example.timescheduling.exception.ResourceNotFoundException;
import com.example.timescheduling.dto.RecommendationResponse;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ScheduleRecommendationService {

    private final ParticipantScheduleRepository participantScheduleRepository;
    private final SessionRepository sessionRepository;

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
    public long[] getMandatoryMatch(String sessionId, List<Long> mandatoryIds) {
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        
        List<ParticipantSchedule> mandatorySchedules = schedules.stream()
                .filter(ps -> {
                    if (mandatoryIds != null) {
                        return mandatoryIds.contains(ps.getScheduleId());
                    }
                    return ps.getParticipant().isMandatory();
                })
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

    /**
     * Helper Method: 단일 48-bit Long 데이터에서 연속된 시간대(Start ~ End) 추출
     */
    public List<TimeInterval> extractContinuousTimeIntervals(long bitmask) {
        List<TimeInterval> intervals = new ArrayList<>();
        int startIdx = -1;
        for (int i = 0; i < 48; i++) {
            boolean isActive = (bitmask & (1L << i)) != 0L;
            if (isActive) {
                if (startIdx == -1) {
                    startIdx = i;
                }
            } else {
                if (startIdx != -1) {
                    intervals.add(new TimeInterval(startIdx, i));
                    startIdx = -1;
                }
            }
        }
        if (startIdx != -1) {
            intervals.add(new TimeInterval(startIdx, 48)); // 48 is 24:00 (next day 00:00)
        }
        return intervals;
    }

    public record TimeInterval(int startIdx, int endIdx) {}

    private long createIntervalMask(TimeInterval interval) {
        long mask = 0L;
        for (int i = interval.startIdx(); i < interval.endIdx(); i++) {
            mask |= (1L << i);
        }
        return mask;
    }

    private long getMaskForDay(ParticipantSchedule ps, int day) {
        return switch (day) {
            case 0 -> ps.getBitmask0();
            case 1 -> ps.getBitmask1();
            case 2 -> ps.getBitmask2();
            case 3 -> ps.getBitmask3();
            case 4 -> ps.getBitmask4();
            case 5 -> ps.getBitmask5();
            case 6 -> ps.getBitmask6();
            default -> 0L;
        };
    }

    private List<String> getAttendees(List<ParticipantSchedule> schedules, int day, TimeInterval interval) {
        List<String> attendees = new ArrayList<>();
        long intervalMask = createIntervalMask(interval);
        for (ParticipantSchedule ps : schedules) {
            long dayMask = getMaskForDay(ps, day);
            if ((dayMask & intervalMask) == intervalMask) {
                attendees.add(ps.getParticipant().getNickname());
            }
        }
        return attendees;
    }

    /**
     * API 3.1 용 추천 스케줄 리스트 도출
     */
    public List<RecommendationResponse> getRecommendations(String sessionId, List<Long> mandatoryIds) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
        int totalMembers = schedules.size();

        List<RecommendationResponse> recommendations = new ArrayList<>();

        // 1. Perfect Match
        long[] perfectMatch = getPerfectMatch(sessionId);
        for (int day = 0; day < 7; day++) {
            long mask = perfectMatch[day];
            if (mask != 0L) {
                LocalDate date = session.getStartDate().plusDays(day);
                List<TimeInterval> intervals = extractContinuousTimeIntervals(mask);
                for (TimeInterval interval : intervals) {
                    List<String> attendees = getAttendees(schedules, day, interval);
                    double attendanceRate = totalMembers == 0 ? 0.0 : Math.round(((double) attendees.size() / totalMembers) * 100.0);
                    
                    String startStr = decodeIndexToTime(interval.startIdx());
                    String endStr = (interval.endIdx() == 48) ? "24:00" : decodeIndexToTime(interval.endIdx());
                    recommendations.add(new RecommendationResponse(
                        0, // 임시 rank (정렬 후 재할당)
                        "MAX_ATTENDANCE", // Enum to match UI: MAX_ATTENDANCE
                        date,
                        startStr,
                        endStr,
                        attendanceRate,
                        attendees
                    ));
                }
            }
        }

        // 2. Mandatory Match
        long[] mandatoryMatch = getMandatoryMatch(sessionId, mandatoryIds);
        for (int day = 0; day < 7; day++) {
            long mask = mandatoryMatch[day];
            // Perfect match에 포함된 시간은 제외할 수 있으나 요구사항에 따라 일단 모두 추가
            if (mask != 0L) {
                LocalDate date = session.getStartDate().plusDays(day);
                List<TimeInterval> intervals = extractContinuousTimeIntervals(mask);
                for (TimeInterval interval : intervals) {
                    List<String> attendees = getAttendees(schedules, day, interval);
                    double attendanceRate = totalMembers == 0 ? 0.0 : Math.round(((double) attendees.size() / totalMembers) * 100.0);

                    String startStr = decodeIndexToTime(interval.startIdx());
                    String endStr = (interval.endIdx() == 48) ? "24:00" : decodeIndexToTime(interval.endIdx());
                    recommendations.add(new RecommendationResponse(
                        0, // 임시 rank (정렬 후 재할당)
                        "MAX_CONTINUITY", // Changed to match UI
                        date,
                        startStr,
                        endStr,
                        attendanceRate,
                        attendees
                    ));
                }
            }
        }

        // 다중 조건 정렬(Tie-breaking) 적용
        // 1순위: 참석 인원수 (Desc)
        // 2순위: 연속된 시간 (Desc)
        // 3순위: 날짜 (Asc)
        // 4순위: 시작 시간 (Asc)
        List<RecommendationResponse> sortedRecommendations = recommendations.stream()
                .sorted(Comparator.comparing((RecommendationResponse r) -> r.attendees().size()).reversed()
                        .thenComparing(Comparator.comparing((RecommendationResponse r) -> calculateDurationMinutes(r.startTime(), r.endTime())).reversed())
                        .thenComparing(RecommendationResponse::date)
                        .thenComparing(Comparator.comparing(r -> parseTimeToMinutes(r.startTime()))))
                .toList();

        // 순위(rank) 재할당
        List<RecommendationResponse> finalResult = new ArrayList<>();
        for (int i = 0; i < sortedRecommendations.size(); i++) {
            RecommendationResponse r = sortedRecommendations.get(i);
            finalResult.add(new RecommendationResponse(
                i + 1,
                r.recommendationType(),
                r.date(),
                r.startTime(),
                r.endTime(),
                r.attendanceRate(),
                r.attendees()
            ));
        }

        return finalResult;
    }

    private static int calculateDurationMinutes(String start, String end) {
        return parseTimeToMinutes(end) - parseTimeToMinutes(start);
    }

    private static int parseTimeToMinutes(String time) {
        String[] parts = time.split(":");
        int hours = Integer.parseInt(parts[0]);
        int minutes = Integer.parseInt(parts[1]);
        return hours * 60 + minutes;
    }
}
