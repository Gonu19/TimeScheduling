package com.example.timescheduling.service;

import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.dto.UpdateAvailabilityRequest;
import com.example.timescheduling.dto.UpdateAvailabilityResponse;
import com.example.timescheduling.exception.ResourceNotFoundException;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ParticipantService {

    private final ParticipantScheduleRepository participantScheduleRepository;

    @Transactional
    public UpdateAvailabilityResponse updateAvailability(String sessionId, Long memberId, UpdateAvailabilityRequest request) {
        long[] bitmasks = request.availableBitmasks();
        if (bitmasks == null || bitmasks.length != 7) {
            throw new IllegalArgumentException("비트마스크 배열의 크기는 반드시 7이어야 하며, 48-bit 허용 범위를 초과할 수 없습니다.");
        }
        
        long maxVal = (1L << 48) - 1;
        for (long mask : bitmasks) {
            // Unsigned comparison or just strictly checking the boundary
            // We know mask shouldn't exceed 48 bits (so it must be between 0 and 2^48 - 1)
            if (mask < 0 || mask > maxVal) {
                throw new IllegalArgumentException("비트마스크 배열의 크기는 반드시 7이어야 하며, 48-bit 허용 범위를 초과할 수 없습니다.");
            }
        }

        ParticipantSchedule ps = participantScheduleRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 참가자입니다."));

        if (!ps.getSession().getSessionId().equals(sessionId)) {
            // Cross-reference 감지 시 403 Forbidden
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 세션에 속한 멤버가 아닙니다.");
        }

        if (ps.getSession().getStatus() == com.example.timescheduling.domain.SessionStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 확정된 세션은 스케줄을 변경할 수 없습니다.");
        }

        // Bitmask 필드를 강제로 수정하기 위해 새로운 객체를 만들지 않고 Reflection이나 Setter를 써야 하지만, 
        // 엔티티에 Setter를 열지 않았으므로 패키지 프라이빗 업데이트 로직이나 빌더를 사용한 복사가 필요합니다.
        // 여기서는 안전하게 비즈니스 메서드를 엔티티에 추가하거나 내부 로직을 통해 업데이트해야 합니다.
        // Wait, 엔티티 수정 메서드가 없으므로, ParticipantSchedule에 updateBitmasks 메서드를 추가하겠습니다.
        ps.updateBitmasks(bitmasks[0], bitmasks[1], bitmasks[2], bitmasks[3], bitmasks[4], bitmasks[5], bitmasks[6]);

        // JPA Dirty Checking으로 자동 저장되지만, 명시적으로 호출 (버전 증가 트리거)
        participantScheduleRepository.save(ps);

        return new UpdateAvailabilityResponse(ps.getScheduleId(), LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
    }

    @Transactional(readOnly = true)
    public com.example.timescheduling.dto.LoadAvailabilityResponse loadAvailability(String sessionId, Long memberId) {
        ParticipantSchedule ps = participantScheduleRepository.findById(memberId)
                .orElseThrow(() -> new com.example.timescheduling.exception.CustomApiException(
                        "ERR_NOT_FOUND", "존재하지 않거나 만료된 참가자입니다.", HttpStatus.NOT_FOUND));

        if (!ps.getSession().getSessionId().equals(sessionId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 세션에 속한 멤버가 아닙니다.");
        }

        if (ps.getVersion() == 0) {
            throw new com.example.timescheduling.exception.CustomApiException(
                    "ERR_AVAILABILITY_NOT_FOUND", "해당 멤버는 아직 가용시간을 등록하지 않았습니다.", HttpStatus.NOT_FOUND);
        }

        long[] bitmasks = new long[]{
                ps.getBitmask0(), ps.getBitmask1(), ps.getBitmask2(),
                ps.getBitmask3(), ps.getBitmask4(), ps.getBitmask5(), ps.getBitmask6()
        };

        // There's no updatedAt field in ParticipantSchedule, so we use current time or a default string for now.
        // If there's an Auditable modifiedAt, we would use that. For now we use the ISO string of current time.
        String updatedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME) + "Z";
        return new com.example.timescheduling.dto.LoadAvailabilityResponse(bitmasks, updatedAt);
    }
}
