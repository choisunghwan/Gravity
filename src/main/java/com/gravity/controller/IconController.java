package com.gravity.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

@RestController
public class IconController {

    @GetMapping("/icon-{size}.png")
    public ResponseEntity<byte[]> icon(@PathVariable int size) throws Exception {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        double s = size / 512.0;

        // 배경 (둥근 사각형)
        g.setColor(new Color(5, 5, 16));
        g.fill(new RoundRectangle2D.Double(0, 0, size, size, size * 0.22, size * 0.22));

        // 별
        int[][] stars = {{80,90},{420,70},{440,180},{70,350},{460,400},{130,430},{380,450},{310,60}};
        for (int[] st : stars) {
            g.setColor(new Color(255, 255, 255, 180));
            int r = (int)(2 * s);
            g.fillOval((int)(st[0]*s)-r, (int)(st[1]*s)-r, r*2, r*2);
        }

        int cx = size / 2, cy = size / 2;
        int pr = (int)(100 * s); // 행성 반지름
        int rx = (int)(178 * s), ry = (int)(44 * s); // 링 크기
        int ringY = (int)(268 * s);
        double angle = Math.toRadians(-18);

        // 링 뒷면 (행성 위 절반)
        g.setClip(0, 0, size, (int)(248 * s));
        drawRing(g, cx, ringY, rx, ry, angle, new Color(240, 171, 252, 120), (int)(14 * s));
        drawRing(g, cx, ringY, (int)(155*s), (int)(34*s), angle, new Color(124, 58, 237, 60), (int)(8*s));
        g.setClip(null);

        // 행성 글로우
        RadialGradientPaint glowPaint = new RadialGradientPaint(
            new Point2D.Double(cx, cy), (int)(130 * s),
            new float[]{0f, 1f},
            new Color[]{new Color(167, 139, 250, 120), new Color(124, 58, 237, 0)}
        );
        g.setPaint(glowPaint);
        g.fillOval(cx - (int)(130*s), cy - (int)(130*s), (int)(260*s), (int)(260*s));

        // 행성 본체
        RadialGradientPaint planetPaint = new RadialGradientPaint(
            new Point2D.Double(cx - pr * 0.2, cy - pr * 0.25), pr,
            new float[]{0f, 0.45f, 1f},
            new Color[]{new Color(192, 132, 252), new Color(124, 58, 237), new Color(59, 7, 100)}
        );
        g.setPaint(planetPaint);
        g.fillOval(cx - pr, cy - pr, pr * 2, pr * 2);

        // 줄무늬
        g.setColor(new Color(147, 51, 234, 80));
        g.fillOval(cx - pr, (int)((230-18)*s), pr*2, (int)(36*s));
        g.setColor(new Color(109, 40, 217, 70));
        g.fillOval(cx - pr, (int)((270-14)*s), pr*2, (int)(28*s));

        // 하이라이트
        g.setColor(new Color(255, 255, 255, 25));
        g.fillOval((int)((256-38-38)*s), (int)((210-24)*s), (int)(76*s), (int)(48*s));

        // 링 앞면 (행성 아래 절반)
        g.setClip(0, (int)(248 * s), size, size);
        drawRing(g, cx, ringY, rx, ry, angle, new Color(240, 171, 252, 200), (int)(14 * s));
        drawRing(g, cx, ringY, (int)(155*s), (int)(34*s), angle, new Color(240, 171, 252, 100), (int)(5*s));
        g.setClip(null);

        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header("Cache-Control", "public, max-age=86400")
            .body(out.toByteArray());
    }

    private void drawRing(Graphics2D g, int cx, int cy, int rx, int ry, double angle, Color color, int strokeW) {
        g.setColor(color);
        g.setStroke(new BasicStroke(strokeW, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        AffineTransform orig = g.getTransform();
        g.rotate(angle, cx, cy);
        g.drawOval(cx - rx, cy - ry, rx * 2, ry * 2);
        g.setTransform(orig);
    }
}
