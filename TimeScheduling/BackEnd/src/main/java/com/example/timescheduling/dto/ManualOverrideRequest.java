package com.example.timescheduling.dto;

import java.util.List;

public record ManualOverrideRequest(
    List<AdjustedSlot> adjustedSlots,
    String overrideReason
) {
    public record AdjustedSlot(
        String time,
        String removed,
        String added
    ) {}
}
