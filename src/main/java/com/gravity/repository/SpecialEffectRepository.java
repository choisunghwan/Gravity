package com.gravity.repository;

import com.gravity.entity.SpecialEffect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

public interface SpecialEffectRepository extends JpaRepository<SpecialEffect, Long> {

    @Query("SELECT e FROM SpecialEffect e WHERE e.receiverId = :userId AND e.createdAt > :since")
    List<SpecialEffect> findPendingEffects(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Modifying
    @Transactional
    @Query("DELETE FROM SpecialEffect e WHERE e.createdAt < :before")
    void deleteOldEffects(@Param("before") LocalDateTime before);
}
