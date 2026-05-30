package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.domain.Session;
import com.example.timescheduling.dto.RecommendationResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class MeetingCalculationStrategy {

    public List<RecommendationResponse> calculate(Session session, List<ParticipantSchedule> schedules) {

        List<RecommendationResponse> recommendations = new ArrayList<>();

        // 1. Perfect Match (All members)
        long[] perfectMatch = getPerfectMatch(schedules);
        for (int day = 0; day < 7; day++) {
            long mask = perfectMatch[day];
            if (mask != 0L) {
                LocalDate date = session.getStartDate().plusDays(day);
                List<ScheduleCalculationHelper.TimeInterval> intervals = ScheduleCalculationHelper.extractContinuousTimeIntervals(mask);
                for (ScheduleCalculationHelper.TimeInterval interval : intervals) {
                    List<String> attendees = getAttendees(schedules, day, interval);

                    
                    LocalDateTime startDt = date.atTime(interval.startIdx() / 2, (interval.startIdx() % 2) * 30);
                    LocalDateTime endDt = (interval.endIdx() == 48) ? date.plusDays(1).atStartOfDay() : date.atTime(interval.endIdx() / 2, (interval.endIdx() % 2) * 30);
                    String sStr = String.format("%02d:%02d", startDt.getHour(), startDt.getMinute());
                    String eStr = String.format("%02d:%02d", endDt.getHour(), endDt.getMinute());

                    recommendations.add(new RecommendationResponse(
                        0,
                        "MAX_ATTENDANCE",
                        date.toString(),
                        sStr,
                        eStr,
                        attendees.size(),
                        attendees,
                        0L
                    ));
                }
            }
        }

        // 2. Mandatory Match (Core members only)
        long[] mandatoryMatch = getMandatoryMatch(schedules);
        for (int day = 0; day < 7; day++) {
            long mask = mandatoryMatch[day];
            if (mask != 0L) {
                LocalDate date = session.getStartDate().plusDays(day);
                List<ScheduleCalculationHelper.TimeInterval> intervals = ScheduleCalculationHelper.extractContinuousTimeIntervals(mask);
                for (ScheduleCalculationHelper.TimeInterval interval : intervals) {
                    List<String> attendees = getAttendees(schedules, day, interval);


                    LocalDateTime startDt = date.atTime(interval.startIdx() / 2, (interval.startIdx() % 2) * 30);
                    LocalDateTime endDt = (interval.endIdx() == 48) ? date.plusDays(1).atStartOfDay() : date.atTime(interval.endIdx() / 2, (interval.endIdx() % 2) * 30);
                    String sStr = String.format("%02d:%02d", startDt.getHour(), startDt.getMinute());
                    String eStr = String.format("%02d:%02d", endDt.getHour(), endDt.getMinute());

                    recommendations.add(new RecommendationResponse(
                        0,
                        "MAX_CONTINUITY",
                        date.toString(),
                        sStr,
                        eStr,
                        attendees.size(),
                        attendees,
                        0L
                    ));
                }
            }
        }

        // Apply Tie-breaking Logic (Attendance -> Duration -> Date -> StartTime)
        List<RecommendationResponse> sortedRecommendations = recommendations.stream()
                .sorted(Comparator.comparing((RecommendationResponse r) -> r.attendees().size()).reversed()
                        .thenComparing(Comparator.comparing((RecommendationResponse r) -> calculateDurationMinutes(r)).reversed())
                        .thenComparing(r -> r.date())
                        .thenComparing(Comparator.comparing(r -> r.startTime())))
                .toList();

        // Assign Rank (1 to Top 3)
        List<RecommendationResponse> finalResult = new ArrayList<>();
        for (int i = 0; i < sortedRecommendations.size(); i++) {
            RecommendationResponse r = sortedRecommendations.get(i);
            finalResult.add(new RecommendationResponse(
                i + 1,
                r.type(),
                r.date(),
                r.startTime(),
                r.endTime(),
                r.attendeesCount(),
                r.attendees(),
                0L
            ));
        }

        return finalResult;
    }

    private long[] getPerfectMatch(List<ParticipantSchedule> schedules) {
        if (schedules.isEmpty()) {
            return new long[]{0L, 0L, 0L, 0L, 0L, 0L, 0L};
        }
        long[] result = new long[7];
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
        long mask48 = (1L << 48) - 1;
        for (int i = 0; i < 7; i++) {
            result[i] &= mask48;
        }
        return result;
    }

    private long[] getMandatoryMatch(List<ParticipantSchedule> schedules) {
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



    private List<String> getAttendees(List<ParticipantSchedule> schedules, int day, ScheduleCalculationHelper.TimeInterval interval) {
        List<String> attendees = new ArrayList<>();
        long intervalMask = ScheduleCalculationHelper.createIntervalMask(interval.startIdx(), interval.endIdx());
        for (ParticipantSchedule ps : schedules) {
            long dayMask = ScheduleCalculationHelper.getMaskForDay(ps, day);
            if ((dayMask & intervalMask) == intervalMask) {
                attendees.add(ps.getParticipant().getNickname());
            }
        }
        return attendees;
    }

    private int calculateDurationMinutes(RecommendationResponse r) {
        String[] sParts = r.startTime().split(":");
        String[] eParts = r.endTime().split(":");
        int sMins = Integer.parseInt(sParts[0]) * 60 + Integer.parseInt(sParts[1]);
        int eMins = Integer.parseInt(eParts[0]) * 60 + Integer.parseInt(eParts[1]);
        return eMins - sMins;
    }
}
