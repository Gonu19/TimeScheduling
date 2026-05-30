package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.domain.Session;
import com.example.timescheduling.dto.AssigneeDto;
import com.example.timescheduling.dto.WorkRecommendationResponse;
import com.example.timescheduling.dto.WorkShiftBlock;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class WorkCalculationStrategy {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<WorkRecommendationResponse> calculate(Session session, List<ParticipantSchedule> schedules) {
        String reqJson = session.getRequirementsJson();
        if (reqJson == null || reqJson.trim().isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, List<Integer>> requirementData;
        try {
            requirementData = objectMapper.readValue(reqJson, new TypeReference<Map<String, List<Integer>>>() {});
        } catch (Exception e) {
            System.err.println("Failed to parse requirementsJson: " + e.getMessage());
            return Collections.emptyList();
        }

        List<WorkCandidate> candidates = new ArrayList<>();
        int totalSegmentsNeeded = 0;

        // Loop over the 7 days (0 to 6)
        for (int day = 0; day < 7; day++) {
            String dayKey = "day_" + day;
            List<Integer> demand = requirementData.get(dayKey);
            if (demand == null || demand.size() != 48) {
                continue;
            }

            // Boundary-Aware Interval Generation
            // Find continuous segments of slots where Demand > 0
            int segStart = -1;
            for (int s = 0; s < 48; s++) {
                boolean hasDemand = demand.get(s) > 0;
                if (hasDemand) {
                    if (segStart == -1) {
                        segStart = s;
                    }
                } else {
                    if (segStart != -1) {
                        // segment found: [segStart, s)
                        totalSegmentsNeeded++;
                        generateCandidatesForSegment(candidates, session, day, demand, schedules, segStart, s);
                        segStart = -1;
                    }
                }
            }
            if (segStart != -1) {
                totalSegmentsNeeded++;
                generateCandidatesForSegment(candidates, session, day, demand, schedules, segStart, 48);
            }
        }

        if (candidates.isEmpty() || candidates.size() < totalSegmentsNeeded) {
            return Collections.emptyList();
        }

        List<WorkShiftBlock> weeklyPlan = new ArrayList<>();

        for (WorkCandidate c : candidates) {
            LocalDateTime startDt = c.date().atTime(c.startIdx() / 2, (c.startIdx() % 2) * 30);
            LocalDateTime endDt = (c.endIdx() == 48) ? c.date().plusDays(1).atStartOfDay() : c.date().atTime(c.endIdx() / 2, (c.endIdx() % 2) * 30);
            weeklyPlan.add(new WorkShiftBlock(startDt, endDt, c.attendees()));
        }

        WorkRecommendationResponse weeklyRecommendation = new WorkRecommendationResponse(
            1,
            "100%",
            weeklyPlan,
            0L
        );

        return List.of(weeklyRecommendation);
    }

    private void generateCandidatesForSegment(
            List<WorkCandidate> candidates,
            Session session,
            int day,
            List<Integer> demand,
            List<ParticipantSchedule> schedules,
            int segStart,
            int segEnd) {

        int startIdx = segStart;
        int endIdx = segEnd;
        
        int demandSum = 0;
        for (int s = startIdx; s < endIdx; s++) {
            demandSum += demand.get(s);
        }

        if (demandSum == 0) {
            return;
        }

        long intervalMask = ScheduleCalculationHelper.createIntervalMask(startIdx, endIdx);

                // 1. Mandatory Participants Constraint (At least one must be available for the entire interval)
                boolean hasMandatoryInSession = false;
                boolean atLeastOneMandatoryAvailable = false;
                
                for (ParticipantSchedule ps : schedules) {
                    if (ps.getParticipant().isMandatory()) {
                        hasMandatoryInSession = true;
                        long mask = ScheduleCalculationHelper.getMaskForDay(ps, day);
                        // Must be available for all slots in the candidate interval
                        if ((mask & intervalMask) == intervalMask) {
                            atLeastOneMandatoryAvailable = true;
                            break;
                        }
                    }
                }
                
        if (hasMandatoryInSession && !atLeastOneMandatoryAvailable) {
            return;
        }

        // 2. Target Coverage Sum
        int actualCoverage = 0;
        for (int s = startIdx; s < endIdx; s++) {
            int availableStaff = 0;
            for (ParticipantSchedule ps : schedules) {
                long mask = ScheduleCalculationHelper.getMaskForDay(ps, day);
                if ((mask & (1L << s)) != 0L) {
                    availableStaff++;
                }
            }
            actualCoverage += Math.min(demand.get(s), availableStaff);
        }

        // 3. 100% Coverage Hard Constraint
        if (actualCoverage < demandSum) {
            return;
        }

        double coverageRate = (double) actualCoverage / demandSum;

        // 4. Overstaffing (Surplus) Sum
        int surplus = 0;
        for (int s = startIdx; s < endIdx; s++) {
            int availableStaff = 0;
            for (ParticipantSchedule ps : schedules) {
                long mask = ScheduleCalculationHelper.getMaskForDay(ps, day);
                if ((mask & (1L << s)) != 0L) {
                    availableStaff++;
                }
            }
            surplus += Math.max(0, availableStaff - demand.get(s));
        }

        int fragmentedSegments = 0;
        List<ParticipantSchedule> availableMembers = new ArrayList<>();

        for (ParticipantSchedule ps : schedules) {
            long dayMask = ScheduleCalculationHelper.getMaskForDay(ps, day);
            boolean canWorkSome = (dayMask & intervalMask) != 0L;
            if (canWorkSome) {
                availableMembers.add(ps);

                boolean inSegment = false;
                int segments = 0;
                for (int s = startIdx; s < endIdx; s++) {
                    boolean isActive = (dayMask & (1L << s)) != 0L;
                    if (isActive) {
                        if (!inSegment) {
                            segments++;
                            inSegment = true;
                        }
                    } else {
                        inSegment = false;
                    }
                }
                fragmentedSegments += segments;
            }
        }

        // PRIORITY ASSIGNMENT: isMandatory = true 인원 최우선, 그다음 해당 구간 많이 참석 가능한 순서
        availableMembers.sort((ps1, ps2) -> {
            boolean m1 = ps1.getParticipant().isMandatory();
            boolean m2 = ps2.getParticipant().isMandatory();
            if (m1 != m2) {
                return m1 ? -1 : 1;
            }
            long msk1 = ScheduleCalculationHelper.getMaskForDay(ps1, day) & intervalMask;
            long msk2 = ScheduleCalculationHelper.getMaskForDay(ps2, day) & intervalMask;
            return Integer.compare(Long.bitCount(msk2), Long.bitCount(msk1));
        });

        int maxDemand = 0;
        for (int s = startIdx; s < endIdx; s++) {
            maxDemand = Math.max(maxDemand, demand.get(s));
        }

        List<AssigneeDto> attendees = new ArrayList<>();
        int limit = Math.min(maxDemand, availableMembers.size());
        for (int i = 0; i < limit; i++) {
            ParticipantSchedule ps = availableMembers.get(i);
            attendees.add(new AssigneeDto(ps.getParticipant().getParticipantUid(), ps.getParticipant().getNickname(), ps.getParticipant().isMandatory()));
        }

        LocalDate date = session.getStartDate().plusDays(day);
        String startTime = String.format("%02d:%02d", startIdx / 2, (startIdx % 2) * 30);
        String endTime = (endIdx == 48) ? "24:00" : String.format("%02d:%02d", endIdx / 2, (endIdx % 2) * 30);

        candidates.add(new WorkCandidate(
            date,
            startIdx,
            endIdx,
            startTime,
            endTime,
            coverageRate,
            surplus,
            fragmentedSegments,
            attendees
        ));
    }



    private record WorkCandidate(
        LocalDate date,
        int startIdx,
        int endIdx,
        String startTime,
        String endTime,
        double coverageRate,
        int surplus,
        int fragmentedSegments,
        List<AssigneeDto> attendees
    ) {}
}
