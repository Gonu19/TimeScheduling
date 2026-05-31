package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;

import java.util.ArrayList;
import java.util.List;

public class ScheduleCalculationHelper {

    public static long createIntervalMask(int startIdx, int endIdx) {
        long mask = 0L;
        for (int i = startIdx; i < endIdx; i++) {
            mask |= (1L << i);
        }
        return mask;
    }

    public static long getMaskForDay(ParticipantSchedule ps, int day) {
        return switch (day) {
            case 0 -> ps.getBitmask0();
            case 1 -> ps.getBitmask1();
            case 2 -> ps.getBitmask2();
            case 3 -> ps.getBitmask3();
            case 4 -> ps.getBitmask4();
            case 5 -> ps.getBitmask5();
            case 6 -> ps.getBitmask6();
            default -> 0L;
        };
    }

    public static List<TimeInterval> extractContinuousTimeIntervals(long bitmask) {
        List<TimeInterval> intervals = new ArrayList<>();
        int startIdx = -1;
        for (int i = 0; i < 48; i++) {
            boolean isActive = (bitmask & (1L << i)) != 0L;
            if (isActive) {
                if (startIdx == -1) {
                    startIdx = i;
                }
            } else {
                if (startIdx != -1) {
                    intervals.add(new TimeInterval(startIdx, i));
                    startIdx = -1;
                }
            }
        }
        if (startIdx != -1) {
            intervals.add(new TimeInterval(startIdx, 48));
        }
        return intervals;
    }

    public record TimeInterval(int startIdx, int endIdx) {}

    public static String decodeIndexToTime(int bitIndex) {
        if (bitIndex < 0 || bitIndex > 47) {
            throw new IllegalArgumentException("유효하지 않은 비트 인덱스입니다. (0 ~ 47 허용): " + bitIndex);
        }
        int hour = bitIndex / 2;
        int minute = (bitIndex % 2) * 30;
        return String.format("%02d:%02d", hour, minute);
    }

    public static List<String> extractActiveTimes(long bitmask) {
        List<String> activeTimes = new ArrayList<>();
        for (int i = 0; i < 48; i++) {
            if ((bitmask & (1L << i)) != 0L) {
                activeTimes.add(decodeIndexToTime(i));
            }
        }
        return activeTimes;
    }
}
