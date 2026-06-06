package com.gravity.repository;

import com.gravity.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT p FROM Post p WHERE p.author.id IN :authorIds OR p.isPublic = true ORDER BY p.createdAt DESC")
    List<Post> findFeedPosts(@Param("authorIds") List<Long> authorIds);

    List<Post> findByAuthorOrderByCreatedAtDesc(com.gravity.entity.User author);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Post p WHERE p.author.id = :userId")
    void deleteAllByAuthorId(@Param("userId") Long userId);
}
