package com.example.timescheduling.controller;

import com.example.timescheduling.dto.UpdateAvailabilityRequest;
import com.example.timescheduling.dto.UpdateAvailabilityResponse;
import com.example.timescheduling.service.ParticipantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{sessionId}/members/{memberId}")
@RequiredArgsConstructor
public class ParticipantController {

    private final ParticipantService participantService;

    @PutMapping("/availabilities")
    public ResponseEntity<UpdateAvailabilityResponse> updateAvailability(
            @PathVariable("sessionId") String sessionId,
            @PathVariable("memberId") Long memberId,
            @Valid @RequestBody UpdateAvailabilityRequest request) {

        UpdateAvailabilityResponse response = participantService.updateAvailability(sessionId, memberId, request);
        return ResponseEntity.ok(response);
    }

    @org.springframework.web.bind.annotation.GetMapping("/availabilities")
    public ResponseEntity<com.example.timescheduling.dto.LoadAvailabilityResponse> loadAvailability(
            @PathVariable("sessionId") String sessionId,
            @PathVariable("memberId") Long memberId) {

        return ResponseEntity.ok(participantService.loadAvailability(sessionId, memberId));
    }
}
