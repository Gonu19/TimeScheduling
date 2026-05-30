package com.example.timescheduling.dto;

import java.util.List;

public record SessionResultResponse(
    String sessionId,
    String title,
    List<TimeBlock> confirmedBlocks,
    Integer version
) {}
