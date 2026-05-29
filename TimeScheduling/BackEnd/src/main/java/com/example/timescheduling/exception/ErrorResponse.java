package com.example.timescheduling.exception;

public record ErrorResponse(
    String errorCode,
    String message
) {}
