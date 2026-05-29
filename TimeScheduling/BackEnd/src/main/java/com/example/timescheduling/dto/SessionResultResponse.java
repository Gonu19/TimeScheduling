package com.example.timescheduling.dto;

import java.time.LocalDate;

public record SessionResultResponse(
    String sessionId,
    String title,
    LocalDate confirmedDate,
    String startTime,
    String endTime
) {}
