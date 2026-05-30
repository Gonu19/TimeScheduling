package com.example.timescheduling.controller;

import com.example.timescheduling.dto.SessionCreateRequest;
import com.example.timescheduling.dto.SessionCreateResponse;
import com.example.timescheduling.dto.SessionInfoResponse;
import com.example.timescheduling.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final com.example.timescheduling.service.ScheduleRecommendationService scheduleRecommendationService;

    @PostMapping
    public ResponseEntity<SessionCreateResponse> createSession(@Valid @RequestBody SessionCreateRequest request) {
        SessionCreateResponse response = sessionService.createSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<SessionInfoResponse> getSessionInfo(@PathVariable("sessionId") String sessionId) {
        SessionInfoResponse response = sessionService.getSessionInfo(sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/verify-admin")
    public ResponseEntity<Boolean> verifyAdmin(@PathVariable("sessionId") String sessionId, @RequestBody java.util.Map<String, String> body) {
        String adminToken = body.get("adminToken");
        return ResponseEntity.ok(sessionService.verifyAdmin(sessionId, adminToken));
    }

    @GetMapping("/{sessionId}/recommendations")
    public ResponseEntity<java.util.List<com.example.timescheduling.dto.RecommendationResponse>> getRecommendations(
            @PathVariable("sessionId") String sessionId) {
        return ResponseEntity.ok(scheduleRecommendationService.getRecommendations(sessionId));
    }

    @GetMapping("/{sessionId}/work-recommendations")
    public ResponseEntity<java.util.List<com.example.timescheduling.dto.WorkRecommendationResponse>> getWorkRecommendations(
            @PathVariable("sessionId") String sessionId) {
        return ResponseEntity.ok(scheduleRecommendationService.getWorkRecommendations(sessionId));
    }

    @PostMapping("/{sessionId}/confirm")
    public ResponseEntity<com.example.timescheduling.dto.ConfirmScheduleResponse> confirmSchedule(
            @PathVariable("sessionId") String sessionId, 
            @Valid @RequestBody com.example.timescheduling.dto.ConfirmScheduleRequest request) {
        return ResponseEntity.ok(sessionService.confirmSchedule(sessionId, request));
    }

    @GetMapping("/{sessionId}/result")
    public ResponseEntity<com.example.timescheduling.dto.SessionResultResponse> getSessionResult(@PathVariable("sessionId") String sessionId) {
        return ResponseEntity.ok(sessionService.getSessionResult(sessionId));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{sessionId}/requirements")
    public ResponseEntity<java.util.Map<String, Object>> registerShiftRequirements(
            @PathVariable("sessionId") String sessionId,
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody com.example.timescheduling.dto.RequirementUpdateRequest request) {

        String token = null;
        if (authorization != null && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        }

        sessionService.registerShiftRequirements(sessionId, token, request);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("success", true);
        response.put("message", "근무 요건이 성공적으로 등록되었습니다.");

        return ResponseEntity.ok(response);
    }
}
