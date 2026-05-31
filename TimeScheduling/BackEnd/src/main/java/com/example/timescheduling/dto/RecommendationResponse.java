package com.example.timescheduling.dto;

import java.time.LocalDate;
import java.util.List;

public record RecommendationResponse(
    int rank,
    String recommendationType,
    LocalDate date,
    String startTime,
    String endTime,
    double attendanceRate,
    List<String> attendees
) {}
