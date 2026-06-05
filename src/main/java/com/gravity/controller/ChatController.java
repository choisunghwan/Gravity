package com.gravity.controller;

import com.gravity.dto.ChatMessageDto;
import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import com.gravity.repository.CompatibilityResultRepository;
import com.gravity.service.ChatService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;
    private final CompatibilityResultRepository compatibilityResultRepository;

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

    @GetMapping("/online")
    public List<Long> getOnlinePartners(Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        LocalDateTime threshold = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMinutes(3);
        return compatibilityResultRepository.findByUserOrderByScoreDesc(me).stream()
                .map(c -> c.getPartner())
                .filter(p -> p.getLastActiveAt() != null && p.getLastActiveAt().isAfter(threshold))
                .map(User::getId)
                .collect(Collectors.toList());
    }
}
