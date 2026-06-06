package com.gravity.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

@RestController
public class IconController {

    @GetMapping("/icon-{size}.png")
    public ResponseEntity<byte[]> icon(@PathVariable int size) throws Exception {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // 배경
        GradientPaint bg = new GradientPaint(0, 0, new Color(30, 27, 75), size, size, new Color(5, 5, 16));
        g.setPaint(bg);
        g.fill(new RoundRectangle2D.Double(0, 0, size, size, size * 0.22, size * 0.22));

        // 글로우
        RadialGradientPaint glow = new RadialGradientPaint(
            new java.awt.geom.Point2D.Double(size * 0.5, size * 0.5), size * 0.45f,
            new float[]{0f, 1f},
            new Color[]{new Color(124, 58, 237, 70), new Color(124, 58, 237, 0)}
        );
        g.setPaint(glow);
        g.fillOval(0, 0, size, size);

        // 이모지 렌더링
        Font emojiFont = new Font("Segoe UI Emoji", Font.PLAIN, (int)(size * 0.62));
        g.setFont(emojiFont);
        FontMetrics fm = g.getFontMetrics();
        String emoji = "🪐"; // 🪐
        int tx = (size - fm.stringWidth(emoji)) / 2;
        int ty = (size + fm.getAscent() - fm.getDescent()) / 2 + (int)(size * 0.05);
        g.drawString(emoji, tx, ty);

        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header("Cache-Control", "public, max-age=86400")
            .body(out.toByteArray());
    }
}
