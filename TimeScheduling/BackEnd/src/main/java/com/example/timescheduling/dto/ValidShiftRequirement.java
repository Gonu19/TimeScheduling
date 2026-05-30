package com.example.timescheduling.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Constraint(validatedBy = ShiftRequirementValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidShiftRequirement {
    String message() default "올바르지 않은 근무 요건 데이터입니다.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
