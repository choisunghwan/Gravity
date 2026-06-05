package com.gravity.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false, length = 10)
    private String gender; // MALE, FEMALE

    @Column(length = 20)
    @Builder.Default
    private String role = "ROLE_USER";

    @Column(name = "profile_image", length = 255)
    private String profileImage;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        this.lastActiveAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
    }

    public int getBirthYear() {
        return birthDate.getYear();
    }

    public String getZodiac() {
        String[] zodiacs = {"원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"};
        return zodiacs[getBirthYear() % 12];
    }

    public int getLifePathNumber() {
        String dateStr = birthDate.toString().replace("-", "");
        int sum = dateStr.chars().map(c -> c - '0').sum();
        while (sum > 9) {
            int tmp = 0;
            while (sum > 0) {
                tmp += sum % 10;
                sum /= 10;
            }
            sum = tmp;
        }
        return sum;
    }
}
