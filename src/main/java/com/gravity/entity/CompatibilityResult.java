package com.gravity.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "compatibility_result",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "partner_id"}))
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompatibilityResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "zodiac_score")
    private Integer zodiacScore;

    @Column(name = "numerology_score")
    private Integer numerologyScore;

    @Column(name = "element_score")
    private Integer elementScore;

    @Column(name = "analysis_text", columnDefinition = "TEXT")
    private String analysisText;

    @Column(name = "payment_key", length = 255)
    private String paymentKey;

    @Column(name = "order_id", length = 255)
    private String orderId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
    }
}
