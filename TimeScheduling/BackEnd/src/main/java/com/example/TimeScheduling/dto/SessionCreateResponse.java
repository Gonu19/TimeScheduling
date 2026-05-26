package com.example.timescheduling.dto;

public record SessionCreateResponse(
    String sessionId,
    String adminToken,
    String expiresAt
) {}
