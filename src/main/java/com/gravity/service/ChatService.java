package com.gravity.service;

import com.gravity.dto.ChatMessageDto;
import com.gravity.entity.ChatMessage;
import com.gravity.entity.User;
import com.gravity.repository.ChatMessageRepository;
import com.gravity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional
    public ChatMessageDto sendMessage(Long senderId, Long receiverId, String message) {
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();

        ChatMessage msg = ChatMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .message(message)
                .build();
        chatMessageRepository.save(msg);

        return toDto(msg, senderId);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getConversation(Long userId, Long partnerId) {
        return chatMessageRepository.findConversation(userId, partnerId)
                .stream().map(m -> toDto(m, userId)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getNewMessages(Long userId, String sinceStr) {
        LocalDateTime since = LocalDateTime.parse(sinceStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return chatMessageRepository.findNewMessages(userId, since)
                .stream().map(m -> toDto(m, userId)).collect(Collectors.toList());
    }

    private ChatMessageDto toDto(ChatMessage m, Long currentUserId) {
        return ChatMessageDto.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getName())
                .receiverId(m.getReceiver().getId())
                .message(m.getMessage())
                .createdAt(m.getCreatedAt().format(FMT))
                .mine(m.getSender().getId().equals(currentUserId))
                .build();
    }
}
