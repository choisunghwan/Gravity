package com.gravity.repository;

import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CompatibilityResultRepository extends JpaRepository<CompatibilityResult, Long> {

    List<CompatibilityResult> findByUserOrderByScoreDesc(User user);

    Optional<CompatibilityResult> findByUserAndPartner(User user, User partner);

    boolean existsByUserAndPartner(User user, User partner);

    @Query("SELECT cr FROM CompatibilityResult cr WHERE cr.user = :user OR cr.partner = :user ORDER BY cr.score DESC")
    List<CompatibilityResult> findAllByUserOrPartner(@Param("user") User user);

    Optional<CompatibilityResult> findByOrderId(String orderId);

    long countByUser(User user);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM CompatibilityResult cr WHERE cr.user = :user OR cr.partner = :user")
    void deleteAllByUserOrPartner(@Param("user") User user);
}
