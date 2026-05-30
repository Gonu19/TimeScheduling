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

    @Query("SELECT MAX(ps.version) FROM ParticipantSchedule ps WHERE ps.session.sessionId = :sessionId")
    Integer findMaxVersionBySessionId(@Param("sessionId") String sessionId);
}
