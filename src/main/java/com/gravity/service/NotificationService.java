package com.gravity.service;

import com.gravity.entity.Notification;
import com.gravity.entity.User;
import com.gravity.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientAndIsReadFalse(user);
    }

    @Transactional(readOnly = true)
    public List<Notification> getAll(User user) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsRead(user);
    }

    @Transactional
    public void createConnectionNotification(User recipient, User fromUser) {
        Notification notif = Notification.builder()
                .recipient(recipient)
                .fromUser(fromUser)
                .type("CONNECTION")
                .message(fromUser.getName() + "님과 새로운 행성이 연결됐어요 🪐")
                .link("/dashboard")
                .build();
        notificationRepository.save(notif);
    }
}
