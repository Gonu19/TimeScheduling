package com.example.timescheduling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SessionCreateRequest(
    @NotBlank(message = "세션 제목은 필수입니다.")
    String title,
    @NotBlank(message = "목적(domainType)은 필수입니다.")
    @jakarta.validation.constraints.Pattern(regexp = "^(MEETING|WORK)$", message = "지원하지 않는 팀 목적입니다. 'MEETING' 또는 'WORK'만 입력 가능합니다.")
    String domainType,
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    @jakarta.validation.constraints.FutureOrPresent(message = "시작 날짜는 과거일 수 없습니다.")
    java.time.LocalDate startDate,
    @NotEmpty(message = "참가자는 최소 1명 이상이어야 합니다.")
    List<MemberCreateRequest> members,
    String requirementsJson
) {}
