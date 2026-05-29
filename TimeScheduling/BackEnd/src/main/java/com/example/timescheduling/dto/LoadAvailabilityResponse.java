package com.example.timescheduling.dto;

public record LoadAvailabilityResponse(
    long[] availableBitmasks,
    String updatedAt
) {}
