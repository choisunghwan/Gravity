package com.gravity.repository;

import com.gravity.entity.Post;
import com.gravity.entity.PostLike;
import com.gravity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostAndUser(Post post, User user);

    long countByPost(Post post);

    boolean existsByPostAndUser(Post post, User user);

    @Query("SELECT pl.post.id FROM PostLike pl WHERE pl.user = :user AND pl.post.id IN :postIds")
    Set<Long> findLikedPostIds(@Param("user") User user, @Param("postIds") java.util.List<Long> postIds);

    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.post.id = :postId")
    void deleteAllByPostId(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
