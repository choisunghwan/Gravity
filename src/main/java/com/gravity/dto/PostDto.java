package com.gravity.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class PostDto {
    private Long id;
    private String content;
    private boolean isPublic;
    private LocalDateTime createdAt;
    private Long authorId;
    private String authorName;
    private String authorEmoji;
    private String authorColor;
    private long likeCount;
    private boolean likedByMe;
}
