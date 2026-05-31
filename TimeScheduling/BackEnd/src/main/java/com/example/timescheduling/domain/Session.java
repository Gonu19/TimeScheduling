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
import jakarta.persistence.Convert;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.example.timescheduling.dto.TimeBlock;

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

    @Convert(converter = TimeBlockListConverter.class)
    @Column(name = "confirmed_blocks", columnDefinition = "TEXT")
    private List<TimeBlock> confirmedBlocks;

    @Column(name = "admin_token", length = 36)
    private String adminToken;

    @Column(name = "requirements_json", columnDefinition = "TEXT")
    private String requirementsJson;

    public void confirmSchedule(List<TimeBlock> confirmedBlocks) {
        this.status = SessionStatus.CONFIRMED;
        this.confirmedBlocks = confirmedBlocks;
    }

    public void updateRequirements(String requirementsJson) {
        this.requirementsJson = requirementsJson;
    }
}
