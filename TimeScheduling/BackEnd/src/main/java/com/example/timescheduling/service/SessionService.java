package com.example.timescheduling.service;

import com.example.timescheduling.domain.Participant;
import com.example.timescheduling.domain.ParticipantSchedule;
import com.example.timescheduling.domain.Session;
import com.example.timescheduling.dto.MemberCreateRequest;
import com.example.timescheduling.dto.MemberInfo;
import com.example.timescheduling.dto.SessionCreateRequest;
import com.example.timescheduling.dto.SessionCreateResponse;
import com.example.timescheduling.dto.SessionInfoResponse;
import com.example.timescheduling.exception.ResourceNotFoundException;
import com.example.timescheduling.repository.ParticipantRepository;
import com.example.timescheduling.repository.ParticipantScheduleRepository;
import com.example.timescheduling.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SessionService {

    private final SessionRepository sessionRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantScheduleRepository participantScheduleRepository;

    @Transactional
    public SessionCreateResponse createSession(SessionCreateRequest request) {
        // 후보 날짜 중 가장 빠른 날짜를 startDate로 지정 (또는 오늘)
        LocalDate startDate = request.candidateDates().stream()
                .map(LocalDate::parse)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());

        String sessionId = UUID.randomUUID().toString();
        String adminToken = UUID.randomUUID().toString();
        
        Session session = Session.builder()
                .sessionId(sessionId)
                .adminToken(adminToken)
                .title(request.title())
                .purpose(request.domainType())
                .startDate(startDate)
                .build();
        
        sessionRepository.save(session);

        for (MemberCreateRequest memberReq : request.members()) {
            Participant participant = Participant.builder()
                    .participantUid(UUID.randomUUID().toString())
                    .nickname(memberReq.name())
                    .role(memberReq.role())
                    .isMandatory(memberReq.isMandatory())
                    .build();
            participantRepository.save(participant);

            ParticipantSchedule schedule = ParticipantSchedule.builder()
                    .session(session)
                    .participant(participant)
                    .build();
            participantScheduleRepository.save(schedule);
        }

        // 7일 뒤 만료 시간
        String expiresAt = LocalDateTime.now().plusDays(7).format(DateTimeFormatter.ISO_DATE_TIME) + "Z";

        return new SessionCreateResponse(sessionId, adminToken, expiresAt);
    }

    @Transactional(readOnly = true)
    public boolean verifyAdmin(String sessionId, String adminToken) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        return adminToken != null && adminToken.equals(session.getAdminToken());
    }

    @Transactional(readOnly = true)
    public SessionInfoResponse getSessionInfo(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));

        List<String> candidateDates = IntStream.range(0, 7)
                .mapToObj(i -> session.getStartDate().plusDays(i).toString())
                .toList();

        List<ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);

        List<MemberInfo> members = schedules.stream().map(ps -> {
            boolean hasSubmitted = ps.getVersion() > 0;
            long[] bitmasks = new long[]{
                    ps.getBitmask0(), ps.getBitmask1(), ps.getBitmask2(),
                    ps.getBitmask3(), ps.getBitmask4(), ps.getBitmask5(), ps.getBitmask6()
            };
            return new MemberInfo(
                    ps.getScheduleId(),
                    ps.getParticipant().getNickname(),
                    ps.getParticipant().getRole(),
                    ps.getParticipant().isMandatory(),
                    hasSubmitted,
                    bitmasks
            );
        }).toList();

        return new SessionInfoResponse(
                session.getTitle(),
                session.getPurpose(),
                session.getStatus().name(),
                candidateDates,
                members
        );
    }

    @Transactional
    public com.example.timescheduling.dto.ConfirmScheduleResponse confirmSchedule(String sessionId, com.example.timescheduling.dto.ConfirmScheduleRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));
        
        session.confirmSchedule(request.date(), request.startTime(), request.endTime());
        return new com.example.timescheduling.dto.ConfirmScheduleResponse(session.getSessionId(), session.getStatus().name());
    }

    @Transactional(readOnly = true)
    public com.example.timescheduling.dto.SessionResultResponse getSessionResult(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));
        
        if (session.getStatus() != com.example.timescheduling.domain.SessionStatus.CONFIRMED) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "아직 확정되지 않은 세션입니다.");
        }
        
        return new com.example.timescheduling.dto.SessionResultResponse(
            session.getSessionId(),
            session.getTitle(),
            session.getConfirmedDate(),
            session.getStartTime(),
            session.getEndTime()
        );
    }

    @Transactional
    public com.example.timescheduling.dto.ManualOverrideResponse manualOverride(String sessionId, String adminToken, com.example.timescheduling.dto.ManualOverrideRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));
        
        if (adminToken == null || !adminToken.equals(session.getAdminToken())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "관리자 권한이 없습니다.");
        }

        if (session.getStatus() != com.example.timescheduling.domain.SessionStatus.CONFIRMED) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "아직 확정되지 않은 세션입니다.");
        }

        if (request.overrideReason() == null || request.overrideReason().trim().isEmpty()) {
            throw new com.example.timescheduling.exception.CustomApiException(
                    "ERR_REASON_REQUIRED", 
                    "스케줄 강제 변경 시, 감사 로그를 위한 수정 사유(overrideReason)는 비어둘 수 없습니다.", 
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        // Convert adjustedSlots to JSON string simply (or use Jackson ObjectMapper for robustness, here simple builder)
        // Spring Boot uses Jackson so we could inject ObjectMapper, but for simplicity let's construct JSON manually or rely on basic parsing.
        // Actually, let's use a quick manual JSON string representation since it's just for DB storage audit.
        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("[");
        if (request.adjustedSlots() != null) {
            for (int i = 0; i < request.adjustedSlots().size(); i++) {
                com.example.timescheduling.dto.ManualOverrideRequest.AdjustedSlot slot = request.adjustedSlots().get(i);
                jsonBuilder.append("{")
                           .append("\"time\":\"").append(slot.time()).append("\",")
                           .append("\"removed\":\"").append(slot.removed()).append("\",")
                           .append("\"added\":\"").append(slot.added()).append("\"")
                           .append("}");
                if (i < request.adjustedSlots().size() - 1) jsonBuilder.append(",");
            }
        }
        jsonBuilder.append("]");

        session.applyManualOverride(request.overrideReason(), jsonBuilder.toString());

        return new com.example.timescheduling.dto.ManualOverrideResponse("UPDATED", "스케줄이 관리자에 의해 수동 수정되었습니다.");
    }
}
