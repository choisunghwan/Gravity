package com.gravity.repository;

import com.gravity.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE (m.sender.id = :userId AND m.receiver.id = :partnerId) OR (m.sender.id = :partnerId AND m.receiver.id = :userId) ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversation(@Param("userId") Long userId, @Param("partnerId") Long partnerId);

    @Query("SELECT m FROM ChatMessage m WHERE m.receiver.id = :userId AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<ChatMessage> findNewMessages(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.sender.id = :userId OR m.receiver.id = :userId")
    void deleteAllByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE ((m.sender.id = :userId AND m.receiver.id = :partnerId) OR (m.sender.id = :partnerId AND m.receiver.id = :userId)) AND m.createdAt > :since")
    int countRecentMessages(@Param("userId") Long userId, @Param("partnerId") Long partnerId, @Param("since") LocalDateTime since);
}
