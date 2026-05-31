package com.example.timescheduling.dto;

import java.time.LocalDate;

public record ConfirmScheduleRequest(
    LocalDate date,
    String startTime,
    String endTime
) {}
