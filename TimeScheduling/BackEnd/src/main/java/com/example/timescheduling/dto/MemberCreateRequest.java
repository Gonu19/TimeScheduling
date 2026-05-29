package com.example.timescheduling.dto;

import jakarta.validation.constraints.NotBlank;

public record MemberCreateRequest(
    @NotBlank(message = "이름은 필수입니다.")
    String name,
    String role,
    boolean isMandatory
) {}
