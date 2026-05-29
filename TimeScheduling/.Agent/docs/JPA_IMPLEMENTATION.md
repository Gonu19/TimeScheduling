# TimeScheduling JPA Data Access Layer Implementation

이 문서는 DB 담당자와의 원활한 리뷰 및 스키마 검증을 위해 현재 백엔드 프로젝트에 구현된 JPA Data Access Layer의 핵심 코드(Domain & Repository)를 취합한 리포트입니다. 코드는 수정이나 생략 없이 구현된 그대로(As-is) 제공됩니다.

---

## 1. Domain (Entity) 클래스 전체 코드

### `Session.java`
```java
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
import jakarta.persistence.EnumType;
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

    public void confirmSchedule(LocalDate confirmedDate, String startTime, String endTime) {
        this.status = SessionStatus.CONFIRMED;
        this.confirmedDate = confirmedDate;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}
```

### `Participant.java`
```java
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

import java.time.LocalDateTime;

@Entity
@Table(name = "participant")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Participant {

    @Id
    @Column(name = "participant_uid", length = 36)
    private String participantUid;

    @Column(name = "nickname", length = 50, nullable = false)
    private String nickname;

    @Column(name = "role", length = 50)
    private String role;

    @Column(name = "is_mandatory", nullable = false)
    private boolean isMandatory;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

### `ParticipantSchedule.java`
```java
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
```

---

## 2. Repository 인터페이스 전체 코드

### `SessionRepository.java`
```java
package com.example.timescheduling.repository;

import com.example.timescheduling.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {
}
```

### `ParticipantRepository.java`
```java
package com.example.timescheduling.repository;

import com.example.timescheduling.domain.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParticipantRepository extends JpaRepository<Participant, String> {
}
```

### `ParticipantScheduleRepository.java`
N+1 문제를 방지하기 위해 JPQL로 `JOIN FETCH`가 명시적으로 적용된 쿼리를 사용하고 있습니다.
```java
package com.example.timescheduling.repository;

import com.example.timescheduling.domain.ParticipantSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipantScheduleRepository extends JpaRepository<ParticipantSchedule, Long> {

    @Query("SELECT ps FROM ParticipantSchedule ps JOIN FETCH ps.session JOIN FETCH ps.participant WHERE ps.session.sessionId = :sessionId")
    List<ParticipantSchedule> findAllBySessionId(@Param("sessionId") String sessionId);
}
```

---

## 3. 핵심 설정 코드 (JPA Auditing 등)

엔티티의 생성 시간(`createdAt`) 등을 자동으로 기록하기 위해, 메인 애플리케이션 클래스에 `@EnableJpaAuditing` 어노테이션이 활성화되어 있습니다.

### `TimeSchedulingApplication.java` (일부 발췌)
```java
package com.example.timescheduling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class TimeSchedulingApplication {

	public static void main(String[] args) {
		SpringApplication.run(TimeSchedulingApplication.class, args);
	}

}
```
