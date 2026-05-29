package com.example.timescheduling.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateAvailabilityRequest(
    @NotNull(message = "비트마스크 배열은 필수입니다.")
    @Size(min = 7, max = 7, message = "비트마스크 배열의 크기는 반드시 7이어야 합니다.")
    long[] availableBitmasks
) {}
