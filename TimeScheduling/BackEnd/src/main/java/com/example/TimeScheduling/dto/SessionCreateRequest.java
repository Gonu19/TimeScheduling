package com.example.timescheduling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SessionCreateRequest(
    @NotBlank(message = "세션 제목은 필수입니다.")
    String title,
    @NotBlank(message = "목적(domainType)은 필수입니다.")
    String domainType,
    @NotEmpty(message = "후보 날짜는 최소 1개 이상이어야 합니다.")
    List<String> candidateDates,
    @NotEmpty(message = "참가자는 최소 1명 이상이어야 합니다.")
    List<MemberCreateRequest> members
) {}
