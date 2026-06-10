package com.gravity.controller;

import com.gravity.service.ClaudeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TranslateController {

    private final ClaudeService claudeService;

    @PostMapping("/translate")
    public ResponseEntity<Map<String, String>> translate(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        if (text == null || text.isBlank()) return ResponseEntity.badRequest().build();
        String translated = claudeService.translateToEnglish(text);
        return ResponseEntity.ok(Map.of("translated", translated));
    }
}
