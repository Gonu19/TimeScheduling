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
        
        Session session = Session.builder()
                .sessionId(sessionId)
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

        // 7일 뒤 삭제 만료 시간
        String expiresAt = LocalDateTime.now().plusDays(7).format(DateTimeFormatter.ISO_DATE_TIME) + "Z";
        String adminToken = UUID.randomUUID().toString();

        return new SessionCreateResponse(sessionId, adminToken, expiresAt);
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
                "OPEN",
                candidateDates,
                members
        );
    }
}
