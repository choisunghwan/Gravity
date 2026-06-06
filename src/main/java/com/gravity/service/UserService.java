package com.gravity.service;

import com.gravity.dto.UserRegistrationDto;
import com.gravity.entity.User;
import com.gravity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.gravity.repository.CompatibilityResultRepository compatibilityResultRepository;
    private final com.gravity.repository.ChatMessageRepository chatMessageRepository;
    private final com.gravity.repository.PostRepository postRepository;
    private final com.gravity.repository.PostLikeRepository postLikeRepository;
    private final com.gravity.repository.NotificationRepository notificationRepository;

    @Value("${app.upload.path}")
    private String uploadPath;

    @Transactional
    public User register(UserRegistrationDto dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }
        if (!dto.getPassword().equals(dto.getPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        User user = User.builder()
                .username(dto.getUsername())
                .password(passwordEncoder.encode(dto.getPassword()))
                .name(dto.getName())
                .birthDate(dto.getBirthDate())
                .gender(dto.getGender())
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public void updateInfo(User user, com.gravity.dto.UserUpdateDto dto) {
        user.setName(dto.getName());
        user.setBirthDate(dto.getBirthDate());
        user.setGender(dto.getGender());
        if (dto.getPlanetEmoji() != null && !dto.getPlanetEmoji().isBlank())
            user.setPlanetEmoji(dto.getPlanetEmoji());
        if (dto.getPlanetColor() != null && !dto.getPlanetColor().isBlank())
            user.setPlanetColor(dto.getPlanetColor());
        user.setStatusMessage(dto.getStatusMessage());
        userRepository.save(user);
    }

    @Transactional
    public void updatePassword(User user, com.gravity.dto.UserUpdateDto dto) {
        if (dto.getCurrentPassword() == null || dto.getCurrentPassword().isBlank()) return;
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }
        if (dto.getNewPassword() == null || dto.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("새 비밀번호를 입력해주세요.");
        }
        if (dto.getNewPassword().length() < 8) {
            throw new IllegalArgumentException("새 비밀번호는 8자 이상이어야 합니다.");
        }
        if (!dto.getNewPassword().equals(dto.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("새 비밀번호가 일치하지 않습니다.");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public String updateProfileImage(User user, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 없습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        Path uploadDir = Paths.get(uploadPath);
        Files.createDirectories(uploadDir);

        // 기존 파일 삭제
        if (user.getProfileImage() != null) {
            try { Files.deleteIfExists(uploadDir.resolve(user.getProfileImage())); } catch (Exception ignored) {}
        }

        String ext = file.getOriginalFilename() != null
                ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.'))
                : ".jpg";
        String filename = UUID.randomUUID() + ext;

        Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        user.setProfileImage(filename);
        userRepository.save(user);
        return filename;
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<User> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return List.of();
        }
        return userRepository.searchByKeyword(keyword.trim());
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Transactional
    public void deleteUser(User user) {
        notificationRepository.deleteAllByUserId(user.getId());
        postLikeRepository.deleteAllByUserId(user.getId());
        postRepository.deleteAllByAuthorId(user.getId());
        chatMessageRepository.deleteAllByUser(user.getId());
        compatibilityResultRepository.deleteAllByUserOrPartner(user);
        userRepository.delete(user);
    }
}
