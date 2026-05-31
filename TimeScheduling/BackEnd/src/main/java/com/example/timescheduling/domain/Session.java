package com.example.timescheduling.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Enumerated;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "session")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Session {

    @Id
    @Column(name = "session_id", length = 36)
    private String sessionId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "purpose", length = 20, nullable = false)
    private String purpose;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(jakarta.persistence.EnumType.STRING)
    @Builder.Default
    private SessionStatus status = SessionStatus.OPEN;

    @Column(name = "confirmed_date")
    private LocalDate confirmedDate;

    @Column(name = "start_time", length = 5)
    private String startTime;

    @Column(name = "end_time", length = 5)
    private String endTime;

    @Column(name = "admin_token", length = 36)
    private String adminToken;

    @Column(name = "override_reason", length = 255)
    private String overrideReason;

    @Column(name = "adjusted_slots", columnDefinition = "TEXT")
    private String adjustedSlotsJson;

    public void confirmSchedule(LocalDate confirmedDate, String startTime, String endTime) {
        this.status = SessionStatus.CONFIRMED;
        this.confirmedDate = confirmedDate;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public void applyManualOverride(String overrideReason, String adjustedSlotsJson) {
        this.overrideReason = overrideReason;
        this.adjustedSlotsJson = adjustedSlotsJson;
    }
}
