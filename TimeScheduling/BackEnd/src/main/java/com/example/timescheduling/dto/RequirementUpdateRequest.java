package com.example.timescheduling.dto;

import java.util.List;
import java.util.Map;

public record RequirementUpdateRequest(
    @ValidShiftRequirement
    Map<String, List<Integer>> requirementData
) {}
