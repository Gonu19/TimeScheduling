package com.example.timescheduling.dto;

public record MemberInfo(
    Long memberId,
    String participantId,
    String name,
    String role,
    boolean isMandatory,
    boolean hasSubmitted,
    long[] availableBitmasks
) {}
