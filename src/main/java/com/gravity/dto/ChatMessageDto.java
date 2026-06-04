package com.gravity.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatMessageDto {
    private Long id;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String message;
    private String createdAt;
    private boolean mine;
}
