package com.gravity.repository;

import com.gravity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("SELECT u FROM User u WHERE u.name LIKE %:keyword% OR u.username LIKE %:keyword%")
    List<User> searchByKeyword(@Param("keyword") String keyword);
}
