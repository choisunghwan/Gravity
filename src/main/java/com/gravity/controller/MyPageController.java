package com.gravity.controller;

import com.gravity.dto.UserUpdateDto;
import com.gravity.entity.User;
import com.gravity.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/mypage")
@RequiredArgsConstructor
public class MyPageController {

    private final UserService userService;

    @GetMapping
    public String myPage(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        model.addAttribute("user", user);
        model.addAttribute("updateDto", new UserUpdateDto(
                user.getName(), user.getBirthDate(), user.getGender(), "", "", ""
        ));
        return "mypage/index";
    }

    @PostMapping("/update")
    public String updateInfo(@Valid @ModelAttribute("updateDto") UserUpdateDto dto,
                             BindingResult bindingResult,
                             @AuthenticationPrincipal UserDetails userDetails,
                             Model model,
                             RedirectAttributes redirectAttributes) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();

        if (bindingResult.hasErrors()) {
            model.addAttribute("user", user);
            model.addAttribute("activeTab", "info");
            return "mypage/index";
        }

        try {
            userService.updateInfo(user, dto);

            // 비밀번호 변경 요청이 있으면 처리
            if (dto.getCurrentPassword() != null && !dto.getCurrentPassword().isBlank()) {
                userService.updatePassword(user, dto);
            }

            redirectAttributes.addFlashAttribute("successMsg", "정보가 수정되었습니다.");
        } catch (IllegalArgumentException e) {
            redirectAttributes.addFlashAttribute("errorMsg", e.getMessage());
        }

        return "redirect:/mypage";
    }

    @PostMapping("/upload")
    public String uploadProfile(@RequestParam("file") MultipartFile file,
                                @AuthenticationPrincipal UserDetails userDetails,
                                RedirectAttributes redirectAttributes) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        try {
            userService.updateProfileImage(user, file);
            redirectAttributes.addFlashAttribute("successMsg", "프로필 사진이 변경되었습니다.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMsg", e.getMessage());
        }
        return "redirect:/mypage";
    }

    @PostMapping("/delete")
    public String deleteAccount(@AuthenticationPrincipal UserDetails userDetails,
                                HttpServletRequest request) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        userService.deleteUser(user);
        SecurityContextHolder.clearContext();
        request.getSession().invalidate();
        return "redirect:/auth/login?deleted=true";
    }
}
