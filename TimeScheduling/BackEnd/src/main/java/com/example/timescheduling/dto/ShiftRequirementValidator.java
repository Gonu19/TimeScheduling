package com.example.timescheduling.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.List;
import java.util.Map;

public class ShiftRequirementValidator implements ConstraintValidator<ValidShiftRequirement, Map<String, List<Integer>>> {

    @Override
    public boolean isValid(Map<String, List<Integer>> value, ConstraintValidatorContext context) {
        // Rule 1: Not Null or Empty
        if (value == null || value.isEmpty()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("근무 요건 데이터는 비어있을 수 없습니다.")
                   .addConstraintViolation();
            return false;
        }

        // Rule 2: Key Size & Naming Check (day_0 ~ day_6)
        if (value.size() != 7) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("근무 요건 데이터는 정확히 7일 치(day_0 ~ day_6) 정보가 포함되어야 합니다.")
                   .addConstraintViolation();
            return false;
        }

        for (int i = 0; i < 7; i++) {
            String expectedKey = "day_" + i;
            if (!value.containsKey(expectedKey)) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("근무 요건 데이터의 Key가 명명 규칙(day_0 ~ day_6)을 준수하지 않습니다. 누락된 Key: " + expectedKey)
                       .addConstraintViolation();
                return false;
            }
        }

        // Rule 3 & Rule 4: List Size and Positive Integers check
        for (Map.Entry<String, List<Integer>> entry : value.entrySet()) {
            List<Integer> list = entry.getValue();
            if (list == null) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(entry.getKey() + "의 데이터 배열이 null입니다.")
                       .addConstraintViolation();
                return false;
            }
            
            // Rule 3: List Size must be exactly 48
            if (list.size() != 48) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(entry.getKey() + "의 데이터 배열 길이는 정확히 48이어야 합니다. (현재 길이: " + list.size() + ")")
                       .addConstraintViolation();
                return false;
            }

            // Rule 4: Elements must be positive (>= 0)
            for (int idx = 0; idx < list.size(); idx++) {
                Integer val = list.get(idx);
                if (val == null) {
                    context.disableDefaultConstraintViolation();
                    context.buildConstraintViolationWithTemplate(entry.getKey() + "의 " + idx + "번째 타임슬롯에 빈 값이 입력되었습니다.")
                           .addConstraintViolation();
                    return false;
                }
                if (val < 0) {
                    context.disableDefaultConstraintViolation();
                    context.buildConstraintViolationWithTemplate(entry.getKey() + "의 " + idx + "번째 필요 인원은 0 미만(음수)이 될 수 없습니다.")
                           .addConstraintViolation();
                    return false;
                }
            }
        }

        return true;
    }
}
