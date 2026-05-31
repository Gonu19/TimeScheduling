package com.example.timescheduling.dto;

import java.util.List;

public record SessionInfoResponse(
    String title,
    String domainType,
    String status,
    List<String> candidateDates,
    List<MemberInfo> members,
    String requirementsJson
) {}
