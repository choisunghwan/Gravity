package com.gravity.controller;

import com.gravity.dto.PostDto;
import com.gravity.entity.User;
import com.gravity.service.PostService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/feed")
@RequiredArgsConstructor
public class FeedController {

    private final UserService userService;
    private final PostService postService;

    @GetMapping
    public String feed(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        List<PostDto> posts = postService.getFeedPosts(user);
        model.addAttribute("currentUser", user);
        model.addAttribute("posts", posts);
        return "feed/index";
    }

    @PostMapping("/post")
    public String createPost(@AuthenticationPrincipal UserDetails userDetails,
                             @RequestParam String content,
                             @RequestParam(defaultValue = "false") boolean isPublic,
                             RedirectAttributes redirectAttributes) {
        if (content == null || content.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMsg", "내용을 입력해주세요.");
            return "redirect:/feed";
        }
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        postService.createPost(user, content.trim(), isPublic);
        return "redirect:/feed";
    }

    @PostMapping("/like/{id}")
    @ResponseBody
    public long toggleLike(@PathVariable Long id,
                           @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        return postService.toggleLike(id, user);
    }

    @PostMapping("/edit/{id}")
    public String editPost(@PathVariable Long id,
                           @RequestParam String content,
                           @RequestParam(defaultValue = "false") boolean isPublic,
                           @AuthenticationPrincipal UserDetails userDetails,
                           RedirectAttributes redirectAttributes) {
        if (content == null || content.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMsg", "내용을 입력해주세요.");
            return "redirect:/feed";
        }
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        try {
            postService.updatePost(id, user, content, isPublic);
        } catch (IllegalArgumentException e) {
            redirectAttributes.addFlashAttribute("errorMsg", e.getMessage());
        }
        return "redirect:/feed";
    }

    @PostMapping("/delete/{id}")
    public String deletePost(@PathVariable Long id,
                             @AuthenticationPrincipal UserDetails userDetails,
                             RedirectAttributes redirectAttributes) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        try {
            postService.deletePost(id, user);
        } catch (IllegalArgumentException e) {
            redirectAttributes.addFlashAttribute("errorMsg", e.getMessage());
        }
        return "redirect:/feed";
    }
}
