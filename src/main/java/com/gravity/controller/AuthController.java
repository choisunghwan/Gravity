package com.gravity.controller;

import com.gravity.dto.UserRegistrationDto;
import com.gravity.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @GetMapping("/login")
    public String loginPage(@RequestParam(required = false) String error,
                            @RequestParam(required = false) String logout,
                            @RequestParam(required = false) String deleted,
                            Model model) {
        if (error != null)   model.addAttribute("errorMsg",  "아이디 또는 비밀번호가 올바르지 않습니다.");
        if (logout != null)  model.addAttribute("logoutMsg", "로그아웃 되었습니다.");
        if (deleted != null) model.addAttribute("successMsg", "회원 탈퇴가 완료되었습니다.");
        return "auth/login";
    }

    @GetMapping("/register")
    public String registerPage(Model model) {
        model.addAttribute("dto", new UserRegistrationDto());
        return "auth/register";
    }

    @PostMapping("/register")
    public String register(@Valid @ModelAttribute("dto") UserRegistrationDto dto,
                           BindingResult bindingResult,
                           RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            return "auth/register";
        }

        try {
            userService.register(dto);
            redirectAttributes.addFlashAttribute("successMsg", "회원가입이 완료되었습니다. 로그인해주세요.");
            return "redirect:/auth/login";
        } catch (IllegalArgumentException e) {
            bindingResult.rejectValue("username", "error.username", e.getMessage());
            return "auth/register";
        }
    }

    @GetMapping("/check-username")
    @ResponseBody
    public boolean checkUsername(@RequestParam String username) {
        return !userService.existsByUsername(username);
    }
}
