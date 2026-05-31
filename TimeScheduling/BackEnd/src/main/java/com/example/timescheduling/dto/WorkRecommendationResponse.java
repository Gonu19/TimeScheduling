package com.example.timescheduling.dto;

import java.util.List;

public record WorkRecommendationResponse(
    int rank,
    String totalCoverage,
    List<WorkShiftBlock> weeklyPlan,
    long version
) {}
