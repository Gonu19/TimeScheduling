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
        java.time.LocalDate startDate = request.startDate();
        if (startDate == null) {
            startDate = java.time.LocalDate.now();
        }

        String sessionId = UUID.randomUUID().toString();
        String adminToken = UUID.randomUUID().toString();
        
        Session session = Session.builder()
                .sessionId(sessionId)
                .adminToken(adminToken)
                .title(request.title())
                .purpose(request.domainType())
                .startDate(startDate)
                .build();
        
        org.slf4j.LoggerFactory.getLogger(SessionService.class)
                .info("Saving session with parsed LocalDate (KST): {}", session.getStartDate());
                
        if (request.requirementsJson() != null && !request.requirementsJson().isBlank()) {
            session.updateRequirements(request.requirementsJson());
        }
        
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
                    ps.getParticipant().getParticipantUid(),
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
                members,
                session.getRequirementsJson()
        );
    }

    @Transactional
    public com.example.timescheduling.dto.ConfirmScheduleResponse confirmSchedule(String sessionId, com.example.timescheduling.dto.ConfirmScheduleRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));
        // Removed: Allow re-confirming to update roles (assignments) and time blocks adjustments
        Integer maxVersion = participantScheduleRepository.findMaxVersionBySessionId(sessionId);
        int currentDbVersion = maxVersion != null ? maxVersion : 0;
        int requestedVersion = request.version() != null ? request.version() : 0;
        
        if (currentDbVersion != requestedVersion) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "추천안을 검토하는 동안 다른 팀원이 가용시간을 수정했습니다.");
        }
        
        session.confirmSchedule(request.confirmedBlocks());

        if (request.assignments() != null && !request.assignments().isEmpty()) {
            List<com.example.timescheduling.domain.ParticipantSchedule> schedules = participantScheduleRepository.findAllBySessionId(sessionId);
            for (com.example.timescheduling.domain.ParticipantSchedule ps : schedules) {
                String newRole = request.assignments().get(ps.getScheduleId());
                if (newRole != null) {
                    // Update role directly or via a setter on Participant
                    // Since Participant has @Getter but not @Setter, we might need a method
                    // For now, I'll assume we can add a method to Participant or update it via repository if needed
                    ps.getParticipant().updateRole(newRole);
                }
            }
        }

        return new com.example.timescheduling.dto.ConfirmScheduleResponse(session.getSessionId(), session.getStatus().name());
    }

    @Transactional(readOnly = true)
    public com.example.timescheduling.dto.SessionResultResponse getSessionResult(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));
        
        if (session.getStatus() != com.example.timescheduling.domain.SessionStatus.CONFIRMED) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "아직 확정되지 않은 세션입니다.");
        }
        
        Integer maxVersion = participantScheduleRepository.findMaxVersionBySessionId(sessionId);
        int currentDbVersion = maxVersion != null ? maxVersion : 0;

        return new com.example.timescheduling.dto.SessionResultResponse(
            session.getSessionId(),
            session.getTitle(),
            session.getConfirmedBlocks(),
            currentDbVersion
        );
    }


    @Transactional
    public void registerShiftRequirements(String sessionId, String adminToken, com.example.timescheduling.dto.RequirementUpdateRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("존재하지 않거나 만료된 세션입니다."));

        if (adminToken == null || !adminToken.equals(session.getAdminToken())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "관리자 권한이 없거나 토큰이 유효하지 않습니다.");
        }

        if (session.getStatus() == com.example.timescheduling.domain.SessionStatus.CONFIRMED) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "이미 스케줄이 확정된 세션입니다.");
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String json = mapper.writeValueAsString(request.requirementData());
            session.updateRequirements(json);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "데이터 포맷 변환 오류가 발생했습니다.");
        }
    }
}
