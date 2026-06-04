package com.gravity.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDto {

    @NotBlank(message = "이름을 입력해주세요.")
    @Size(max = 10, message = "이름은 10자 이내로 입력해주세요.")
    private String name;

    @NotNull(message = "생년월일을 입력해주세요.")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    @NotBlank(message = "성별을 선택해주세요.")
    private String gender;

    // 비밀번호 변경 (비어있으면 변경 안 함)
    private String currentPassword;
    private String newPassword;
    private String newPasswordConfirm;
}
