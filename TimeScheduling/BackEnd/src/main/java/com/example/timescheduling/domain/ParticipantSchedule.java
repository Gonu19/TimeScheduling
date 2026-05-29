package com.example.timescheduling.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "participant_schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ParticipantSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id")
    private Long scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Session session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_uid", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Participant participant;

    @Builder.Default
    @Column(name = "bitmask_0", nullable = false)
    private Long bitmask0 = 0L;

    @Builder.Default
    @Column(name = "bitmask_1", nullable = false)
    private Long bitmask1 = 0L;

    @Builder.Default
    @Column(name = "bitmask_2", nullable = false)
    private Long bitmask2 = 0L;

    @Builder.Default
    @Column(name = "bitmask_3", nullable = false)
    private Long bitmask3 = 0L;

    @Builder.Default
    @Column(name = "bitmask_4", nullable = false)
    private Long bitmask4 = 0L;

    @Builder.Default
    @Column(name = "bitmask_5", nullable = false)
    private Long bitmask5 = 0L;

    @Builder.Default
    @Column(name = "bitmask_6", nullable = false)
    private Long bitmask6 = 0L;

    @Version
    @Builder.Default
    @Column(name = "version", nullable = false)
    private Integer version = 0;

    public void updateBitmasks(long b0, long b1, long b2, long b3, long b4, long b5, long b6) {
        this.bitmask0 = b0;
        this.bitmask1 = b1;
        this.bitmask2 = b2;
        this.bitmask3 = b3;
        this.bitmask4 = b4;
        this.bitmask5 = b5;
        this.bitmask6 = b6;
    }
}
