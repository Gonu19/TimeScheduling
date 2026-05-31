package com.example.timescheduling.dto;

import java.util.List;

public record RecommendationResponse(
    int rank,
    String type,
    String date,
    String startTime,
    String endTime,
    int attendeesCount,
    List<String> attendees,
    long version
) {}
