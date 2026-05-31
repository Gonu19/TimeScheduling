package com.example.timescheduling.dto;

import java.util.List;

public record ConfirmScheduleRequest(
    List<TimeBlock> confirmedBlocks,
    Integer version,
    java.util.Map<Long, String> assignments
) {}
