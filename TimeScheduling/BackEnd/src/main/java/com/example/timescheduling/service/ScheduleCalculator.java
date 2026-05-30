package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.domain.Session;
import com.example.timescheduling.dto.RecommendationResponse;
import java.util.List;

public interface ScheduleCalculator {
    List<RecommendationResponse> calculate(Session session, List<ParticipantSchedule> schedules, List<Long> mandatoryIds);
}
