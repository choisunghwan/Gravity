package com.gravity.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

@RestController
public class IconController {

    @GetMapping("/icon-{size}.png")
    public ResponseEntity<byte[]> icon(@PathVariable int size) throws Exception {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // 배경
        g.setColor(new Color(5, 5, 16));
        g.fillRoundRect(0, 0, size, size, size / 5, size / 5);

        double s = size / 512.0;

        // 글로우
        RadialGradientPaint glow = new RadialGradientPaint(
            new java.awt.geom.Point2D.Double(256 * s, 256 * s), (float)(110 * s),
            new float[]{0f, 1f},
            new Color[]{new Color(124, 58, 237, 80), new Color(124, 58, 237, 0)}
        );
        g.setPaint(glow);
        g.fillOval((int)((256-110)*s), (int)((256-110)*s), (int)(220*s), (int)(220*s));

        // 행성
        RadialGradientPaint planet = new RadialGradientPaint(
            new java.awt.geom.Point2D.Double(230 * s, 228 * s), (float)(78 * s),
            new float[]{0f, 1f},
            new Color[]{new Color(125, 211, 252), new Color(14, 165, 233)}
        );
        g.setPaint(planet);
        g.fillOval((int)((256-78)*s), (int)((256-78)*s), (int)(156*s), (int)(156*s));

        // 링
        g.setColor(new Color(196, 181, 253, 140));
        g.setStroke(new BasicStroke((float)(7*s), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.rotate(Math.toRadians(-15), 256*s, 270*s);
        g.drawOval((int)((256-160)*s), (int)((270-40)*s), (int)(320*s), (int)(80*s));
        g.rotate(Math.toRadians(15), 256*s, 270*s);

        // G 텍스트
        g.setColor(new Color(255, 255, 255, 230));
        Font font = new Font("Arial", Font.BOLD, (int)(80 * s));
        g.setFont(font);
        FontMetrics fm = g.getFontMetrics();
        int tx = (size - fm.stringWidth("G")) / 2;
        int ty = (size - fm.getHeight()) / 2 + fm.getAscent();
        g.drawString("G", tx, ty);

        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header("Cache-Control", "public, max-age=86400")
            .body(out.toByteArray());
    }
}
