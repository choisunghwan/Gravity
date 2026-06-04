package com.gravity.controller;

import com.gravity.dto.ChatMessageDto;
import com.gravity.entity.User;
import com.gravity.service.ChatService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;

    @GetMapping("/{partnerId}")
    public List<ChatMessageDto> getConversation(@PathVariable Long partnerId, Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        return chatService.getConversation(me.getId(), partnerId);
    }

    @PostMapping("/{partnerId}")
    public ChatMessageDto sendMessage(@PathVariable Long partnerId,
                                      @RequestBody Map<String, String> body,
                                      Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        return chatService.sendMessage(me.getId(), partnerId, body.get("message"));
    }

    @GetMapping("/new")
    public List<ChatMessageDto> getNewMessages(@RequestParam String since, Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        return chatService.getNewMessages(me.getId(), since);
    }
}
