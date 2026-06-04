package com.gravity.repository;

import com.gravity.entity.Wish;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface WishRepository extends JpaRepository<Wish, Long> {

    @Query("SELECT w FROM Wish w WHERE w.createdAt > :since ORDER BY w.createdAt DESC")
    List<Wish> findActiveWishes(@Param("since") LocalDateTime since);
}
