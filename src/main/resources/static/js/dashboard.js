// ============================================================
//  dashboard.js — Three.js 3D 태양계 뷰어
// ============================================================

// ── Three.js 씬 ──────────────────────────────────────────────────
const canvas = document.getElementById('universeCanvas');
if (!canvas) throw new Error('universeCanvas not found');

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(55, 1, 1, 10000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050510, 1);

// 별똥별·말풍선·이모지 파티클용 overlay canvas
const overlayCanvas = document.getElementById('overlayCanvas');
const overlayCtx    = overlayCanvas ? overlayCanvas.getContext('2d') : null;

// 카메라 – 20° 위에서 내려다보는 뷰 (낮을수록 우주감 증가) + 수평 공전
let cameraDistance = 1600;
const CAM_MIN = 250, CAM_MAX = 8000;
const CAMERA_TILT = 20 * Math.PI / 180;
let cameraAzimuth    = 0;       // 수평 회전각 (radians)
let rotationVelocity = 0;       // 제스처 관성
let handPresent      = false;   // 손 감지 여부
let prevHandX        = null;    // 이전 프레임 손 X (0~1)
const AUTO_ROTATE_SPEED = 0.0008; // 자동 회전 속도 (rad/frame)

function updateCameraPosition() {
    const r = Math.cos(CAMERA_TILT) * cameraDistance;
    const y = Math.sin(CAMERA_TILT) * cameraDistance;
    camera.position.set(Math.sin(cameraAzimuth) * r, y, Math.cos(cameraAzimuth) * r);
    camera.lookAt(0, 0, 0);
}
updateCameraPosition();

// 조명
scene.add(new THREE.AmbientLight(0x223355, 0.8));
const sunLight = new THREE.PointLight(0xFFD250, 2.0, 5000);
sunLight.position.set(320, 120, -240);
scene.add(sunLight);

// 레이캐스터 (hover · click)
const raycaster   = new THREE.Raycaster();
const mouse       = new THREE.Vector2();
let planetSpheres = [];   // raycaster용, planets[]와 동일 인덱스

// Big Bang 3D 오브젝트
let bigBangPoints     = null;
let bigBangVelocities = [];

// 화이트 플래시 div
const bigBangFlashDiv = (() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:white;pointer-events:none;z-index:50;opacity:0;transition:opacity 0.4s';
    document.body.appendChild(d);
    return d;
})();

// ── 공통 변수 ──────────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768;
let planets       = [];
let starField     = null;
let animFrame;
let gestureActive       = false;   // render()보다 먼저 선언 (TDZ 방지)
let currentGestureState = 'IDLE';  // 'IDLE'|'ZOOM_IN'|'ZOOM_OUT'|'ROTATE_LEFT'|'ROTATE_RIGHT'
const voiceWaveRings    = [];      // render()보다 먼저 선언 (TDZ 방지)

let chatOpen           = false;
let currentPartnerId   = null;
let currentPartnerName = null;
function nowKST() { return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19); }
let lastMessageTime  = nowKST();
let pollInterval     = null;
let unreadCount      = 0;
const speechBubbles  = [];
let onlinePartnerIds = new Set();

const emojiParticles = [];

let wishShownIds = new Set();

const supernovaEffects = [];
let bigBangActive  = false;
let bigBangParticles = [];   // 레거시 호환 (미사용)
let bigBangPhase   = 0;
let bigBangTimer   = 0;
let originalPlanetPositions = [];

let shootingStars = [];
let spaceObj3D = [];
let deepSpaceObjects = [];

// ── 궤도 링 상수 ────────────────────────────────────────────────────
const ORBIT_RINGS = [
    { name: '수성',   orbit:  140, color: '#A0A0A0', dotColor: '#B0B0B0', dotSize:  5, angle: 0.8 },
    { name: '금성',   orbit:  240, color: '#C8A45A', dotColor: '#DEB87A', dotSize: 13, angle: 2.1 },
    { name: '화성',   orbit:  360, color: '#C1440E', dotColor: '#E05020', dotSize:  7, angle: 3.8 },
    { name: '목성',   orbit:  700, color: '#C88B3A', dotColor: '#D89B4A', dotSize: 90, angle: 1.2 },
    { name: '토성',   orbit: 1050, color: '#EAD6B8', dotColor: '#EAD6B8', dotSize: 75, angle: 2.0, ring: true },
    { name: '천왕성', orbit: 1500, color: '#7EC8E3', dotColor: '#8ED8F3', dotSize: 32, angle: 4.1 },
    { name: '해왕성', orbit: 2000, color: '#4169E1', dotColor: '#5179F1', dotSize: 30, angle: 2.7 },
];

// ── 태양계 배경 (1회 초기화) ─────────────────────────────────────────
let solarBgObjects = [];

function initSolarBackground() {
    solarBgObjects.forEach(o => scene.remove(o));
    solarBgObjects = [];

    // 태양
    const sunGeom = new THREE.SphereGeometry(50, 24, 24);
    const sunMat  = new THREE.MeshBasicMaterial({ color: 0xFFE060 });
    const sun     = new THREE.Mesh(sunGeom, sunMat);
    sun.position.set(320, 0, -240);
    scene.add(sun);
    solarBgObjects.push(sun);

    // 태양 내부 글로우 (진한 주황)
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(130, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: 0.12 })
    );
    glow.position.copy(sun.position);
    scene.add(glow);
    solarBgObjects.push(glow);

    // 태양 외부 글로우 (희미한 노랑)
    const glow2 = new THREE.Mesh(
        new THREE.SphereGeometry(240, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0.04 })
    );
    glow2.position.copy(sun.position);
    scene.add(glow2);
    solarBgObjects.push(glow2);

    // 궤도 링 + 장식 행성 7개
    ORBIT_RINGS.forEach(r => {
        // 점선 궤도 링
        const pts = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * r.orbit, 0, Math.sin(a) * r.orbit));
        }
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, dashSize: 4, gapSize: 10 })
        );
        line.computeLineDistances();
        scene.add(line);
        solarBgObjects.push(line);

        // 장식 행성 구체
        const dSize  = r.dotSize;
        const segs   = dSize >= 30 ? 24 : 10;
        const dColor = new THREE.Color(r.dotColor);
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(dSize, segs, segs),
            new THREE.MeshStandardMaterial({
                color: dColor, emissive: dColor, emissiveIntensity: 0.25,
                transparent: true, opacity: dSize >= 30 ? 0.45 : 0.5
            })
        );
        dot.position.set(Math.cos(r.angle) * r.orbit, 0, Math.sin(r.angle) * r.orbit);
        scene.add(dot);
        solarBgObjects.push(dot);

        // 토성 링
        if (r.ring) {
            const saturnRing = new THREE.Mesh(
                new THREE.RingGeometry(dSize * 1.8, dSize * 2.8, 32),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(r.dotColor), transparent: true, opacity: 0.25, side: THREE.DoubleSide
                })
            );
            saturnRing.position.copy(dot.position);
            saturnRing.rotation.x = -Math.PI / 2.5;
            scene.add(saturnRing);
            solarBgObjects.push(saturnRing);
        }
    });
}

// ── 우주 오브젝트 3D (UFO / 위성 / 로켓) — THREE.Sprite + CanvasTexture ──
function createEmojiTexture(emoji) {
    const size = 128;
    const cv   = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx  = cv.getContext('2d');
    ctx.font   = `${Math.floor(size * 0.72)}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    return new THREE.CanvasTexture(cv);
}

function spawnSpaceObject3D() {
    const types = [
        { emoji: '🛸', kind: 'ufo',       scale: 70 },
        { emoji: '🛰️', kind: 'satellite', scale: 58 },
        { emoji: '🚀', kind: 'rocket',    scale: 64 },
    ];
    const t        = types[Math.floor(Math.random() * types.length)];
    const texture  = createEmojiTexture(t.emoji);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 });
    const sprite   = new THREE.Sprite(material);
    sprite.scale.set(t.scale, t.scale, 1);

    // 태양계 궤도 바깥 (반지름 1100~2000), 높이 ±500 에 스폰
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius     = 1100 + Math.random() * 900;
    sprite.position.set(
        Math.cos(spawnAngle) * radius,
        (Math.random() - 0.5) * 600,
        Math.sin(spawnAngle) * radius
    );
    scene.add(sprite);

    // 이동 방향: 대략 태양계 반대편 쪽으로
    const moveAngle = spawnAngle + Math.PI + (Math.random() - 0.5) * 1.2;
    const speed     = 0.5 + Math.random() * 0.9;
    const vy        = t.kind === 'rocket'
        ? 0.9 + Math.random() * 0.7          // 로켓은 위쪽으로 상승
        : (Math.random() - 0.5) * 0.5;

    // 로켓 불꽃 trail 스프라이트 (🔥 3개, 뒤따라감)
    const trail = [];
    if (t.kind === 'rocket') {
        const fireTexture = createEmojiTexture('🔥');
        for (let i = 0; i < 3; i++) {
            const fs  = 38 - i * 10;
            const fm  = new THREE.SpriteMaterial({ map: fireTexture, transparent: true, opacity: 0 });
            const fsp = new THREE.Sprite(fm);
            fsp.scale.set(fs, fs, 1);
            fsp.position.copy(sprite.position);
            scene.add(fsp);
            trail.push({ sprite: fsp, delay: (i + 1) * 4 }); // 프레임 지연
        }
    }

    spaceObj3D.push({
        sprite, kind: t.kind, trail,
        vx: Math.cos(moveAngle) * speed,
        vy,
        vz: Math.sin(moveAngle) * speed,
        born: Date.now(),
        life: 45000 + Math.random() * 30000,
        blinkTimer: 0,
        posHistory: [], // 로켓 trail 위치 기록
    });
}

function scheduleSpaceObject() {
    setTimeout(() => { spawnSpaceObject3D(); scheduleSpaceObject(); }, 15000 + Math.random() * 25000);
}

function updateSpaceObjects3D() {
    const now = Date.now();
    spaceObj3D = spaceObj3D.filter(o => {
        const age = now - o.born;
        if (age > o.life) {
            scene.remove(o.sprite);
            o.sprite.material.map.dispose();
            o.sprite.material.dispose();
            o.trail.forEach(f => {
                scene.remove(f.sprite);
                f.sprite.material.map.dispose();
                f.sprite.material.dispose();
            });
            return false;
        }

        const fadeIn  = Math.min(1, age / 2000);
        const fadeOut = Math.min(1, (o.life - age) / 3000);
        let opacity   = fadeIn * fadeOut * 0.92;

        // 위성 깜빡임 (신호음 효과)
        if (o.kind === 'satellite') {
            o.blinkTimer++;
            if (o.blinkTimer % 55 < 5) opacity *= 0.08;
        }
        o.sprite.material.opacity = opacity;

        // 위치 업데이트
        o.sprite.position.x += o.vx;
        o.sprite.position.z += o.vz;
        if (o.kind === 'ufo') {
            o.sprite.position.y += Math.sin(now * 0.001 + o.born * 0.001) * 0.7;
        } else {
            o.sprite.position.y += o.vy;
        }

        // 로켓 🔥 trail: 이전 위치 따라가기
        if (o.kind === 'rocket') {
            o.posHistory.push(o.sprite.position.clone());
            if (o.posHistory.length > 15) o.posHistory.shift();
            o.trail.forEach((f, i) => {
                const idx = o.posHistory.length - 1 - f.delay;
                if (idx >= 0) {
                    f.sprite.position.copy(o.posHistory[idx]);
                    f.sprite.material.opacity = opacity * (0.7 - i * 0.2);
                } else {
                    f.sprite.material.opacity = 0;
                }
            });
        }

        return true;
    });
}

// ── 별똥별 ──────────────────────────────────────────────────────────
function spawnShootingStar() {
    const side = Math.random() < 0.5 ? 'top' : 'left';
    shootingStars.push({
        x: side === 'top' ? Math.random() * overlayCanvas.width : 0,
        y: side === 'top' ? 0 : Math.random() * overlayCanvas.height * 0.5,
        len: Math.random() * 120 + 60, speed: Math.random() * 4 + 3,
        alpha: 1, angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        width: Math.random() * 1.5 + 0.5
    });
}

function scheduleShootingStar() {
    setTimeout(() => { spawnShootingStar(); scheduleShootingStar(); }, 3000 + Math.random() * 5000);
}

function drawShootingStars() {
    if (!overlayCtx) return;
    shootingStars = shootingStars.filter(s => s.alpha > 0.02);
    shootingStars.forEach(s => {
        const tailX = s.x - Math.cos(s.angle) * s.len;
        const tailY = s.y - Math.sin(s.angle) * s.len;
        const grad  = overlayCtx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, `rgba(200,180,255,${s.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);
        overlayCtx.beginPath();
        overlayCtx.moveTo(tailX, tailY);
        overlayCtx.lineTo(s.x, s.y);
        overlayCtx.strokeStyle = grad;
        overlayCtx.lineWidth   = s.width;
        overlayCtx.stroke();
        overlayCtx.beginPath();
        overlayCtx.arc(s.x, s.y, s.width * 1.5, 0, Math.PI * 2);
        overlayCtx.fillStyle = `rgba(255,255,255,${s.alpha * 0.9})`;
        overlayCtx.fill();
        if (s.wish) {
            overlayCtx.save();
            overlayCtx.globalAlpha   = s.alpha * 0.9;
            overlayCtx.fillStyle     = 'rgba(255,230,150,1)';
            overlayCtx.font          = "bold 13px 'Noto Sans KR', sans-serif";
            overlayCtx.textAlign     = 'left';
            overlayCtx.textBaseline  = 'middle';
            overlayCtx.shadowColor   = 'rgba(255,200,50,0.8)';
            overlayCtx.shadowBlur    = 6;
            overlayCtx.fillText(s.wish, s.x + 8, s.y - 8);
            overlayCtx.restore();
        }
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.012;
    });
}

// ── 줌 (카메라 거리) ──────────────────────────────────────────────────
function setScale(factor) {
    cameraDistance = Math.max(CAM_MIN, Math.min(CAM_MAX, cameraDistance / factor));
    updateCameraPosition();
    updateZoomButtons();
}

function updateZoomButtons() {
    const btnIn  = document.getElementById('zoomIn');
    const btnOut = document.getElementById('zoomOut');
    if (btnIn)  btnIn.disabled  = cameraDistance <= CAM_MIN;
    if (btnOut) btnOut.disabled = cameraDistance >= CAM_MAX;
}

// ── 렌더러 크기 조정 ──────────────────────────────────────────────────
function resizeRenderer() {
    const navH = isMobile() ? 56 : 64;
    const w    = window.innerWidth;
    const h    = window.innerHeight - navH;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (overlayCanvas) { overlayCanvas.width = w; overlayCanvas.height = h; }
    if (isMobile()) cameraDistance = Math.min(CAM_MAX, Math.max(900, 1000 * (768 / w)));
    updateCameraPosition();
    initPlanets();
}

// ── 별 파티클 (2레이어: 먼 작은 별 + 가까운 큰 별) ────────────────────
let starField2 = null;

function makeStarLayer(count, rMin, rMax, size, opacity) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = rMin + Math.random() * (rMax - rMin);
        positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity });
    return new THREE.Points(geom, mat);
}

function initStars() {
    if (starField)  { scene.remove(starField);  starField.geometry.dispose();  starField.material.dispose(); }
    if (starField2) { scene.remove(starField2); starField2.geometry.dispose(); starField2.material.dispose(); }

    // 먼 별: 1600개, 작고 희미하게 → 은하수 느낌
    starField  = makeStarLayer(1600, 3000, 6000, 1.2, 0.65);
    // 가까운 별: 400개, 크고 밝게 → 반짝이는 별
    starField2 = makeStarLayer(400,  1800, 3000, 2.8, 0.9);

    scene.add(starField);
    scene.add(starField2);
}

// ── 딥 스페이스 천체 (실제 천체 기반: 은하 · 성운 · 성단) ─────────────
function buildTex(drawFn) {
    const sz = 256, c = document.createElement('canvas');
    c.width = c.height = sz;
    drawFn(c.getContext('2d'), sz);
    return new THREE.CanvasTexture(c);
}

function spiralGalaxyTex(tiltAngle) {
    return buildTex((ctx, sz) => {
        const cx = sz / 2, cy = sz / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle || 0);
        ctx.scale(1, 0.45);      // 기울어진 나선 디스크
        ctx.translate(-cx, -cy);
        // 디스크 헤이즈
        const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.44);
        dg.addColorStop(0,   'rgba(190,210,255,0.30)');
        dg.addColorStop(0.55,'rgba(160,185,255,0.12)');
        dg.addColorStop(1,   'rgba(130,160,255,0)');
        ctx.fillStyle = dg; ctx.fillRect(0, 0, sz, sz);
        // 나선팔 2개 — 랜덤 산란 포함
        for (let arm = 0; arm < 2; arm++) {
            for (let i = 0; i < 280; i++) {
                const t     = i / 280;
                const angle = arm * Math.PI + t * Math.PI * 3.4;
                const r     = t * sz * 0.44;
                const sx    = (Math.random() - 0.5) * sz * 0.055;
                const sy    = (Math.random() - 0.5) * sz * 0.055;
                const x = cx + Math.cos(angle) * r + sx;
                const y = cy + Math.sin(angle) * r + sy;
                const a = (1 - t) * 0.55 + 0.04;
                ctx.fillStyle = `rgba(180,205,255,${a.toFixed(2)})`;
                const s = 0.7 + (1 - t) * 1.9;
                ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
        // 코어 (원래 좌표계)
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.10);
        cg.addColorStop(0,   'rgba(255,245,210,1.0)');
        cg.addColorStop(0.4, 'rgba(255,220,160,0.75)');
        cg.addColorStop(1,   'rgba(255,200,120,0)');
        ctx.fillStyle = cg; ctx.fillRect(0, 0, sz, sz);
    });
}

function ellipticalGalaxyTex() {
    return buildTex((ctx, sz) => {
        ctx.save();
        ctx.translate(sz / 2, sz / 2);
        ctx.rotate(0.4);
        ctx.scale(1, 0.55);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.40);
        g.addColorStop(0,    'rgba(255,248,210,0.95)');
        g.addColorStop(0.28, 'rgba(245,225,175,0.60)');
        g.addColorStop(0.60, 'rgba(220,195,145,0.25)');
        g.addColorStop(1,    'rgba(190,160,110,0)');
        ctx.fillStyle = g; ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
    });
}

function nebulaTex(r1,g1,b1, r2,g2,b2, r3,g3,b3) {
    return buildTex((ctx, sz) => {
        const cx = sz / 2, cy = sz / 2;
        const clouds = [
            { ox:  0,       oy:  0,       rad: sz*0.36, r:r1,g:g1,b:b1, a:0.50 },
            { ox:-sz*0.13,  oy:-sz*0.09,  rad: sz*0.23, r:r2,g:g2,b:b2, a:0.42 },
            { ox: sz*0.11,  oy: sz*0.11,  rad: sz*0.21, r:r3,g:g3,b:b3, a:0.38 },
            { ox:-sz*0.09,  oy: sz*0.13,  rad: sz*0.18, r:r1,g:g1,b:b1, a:0.30 },
            { ox: sz*0.15,  oy:-sz*0.13,  rad: sz*0.16, r:r2,g:g2,b:b2, a:0.26 },
        ];
        clouds.forEach(cl => {
            const grad = ctx.createRadialGradient(cx+cl.ox, cy+cl.oy, 0, cx+cl.ox, cy+cl.oy, cl.rad);
            grad.addColorStop(0, `rgba(${cl.r},${cl.g},${cl.b},${cl.a})`);
            grad.addColorStop(1, `rgba(${cl.r},${cl.g},${cl.b},0)`);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, sz, sz);
        });
        // 중심 밝은 별
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.05);
        sg.addColorStop(0, 'rgba(255,255,255,0.95)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, sz, sz);
    });
}

function starClusterTex(r, g, b) {
    return buildTex((ctx, sz) => {
        const cx = sz / 2, cy = sz / 2;
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.44);
        bg.addColorStop(0,   `rgba(${r},${g},${b},0.25)`);
        bg.addColorStop(0.5, `rgba(${r},${g},${b},0.10)`);
        bg.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = bg; ctx.fillRect(0, 0, sz, sz);
        for (let i = 0; i < 90; i++) {
            const dist  = Math.pow(Math.random(), 0.65) * sz * 0.42;
            const angle = Math.random() * Math.PI * 2;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const a = 0.45 + Math.random() * 0.55;
            const s = 0.7 + Math.random() * 2.0;
            ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
            ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
        }
    });
}

function initDeepSpaceObjects() {
    deepSpaceObjects.forEach(o => {
        scene.remove(o);
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
    });
    deepSpaceObjects = [];

    // 실제 천체 카탈로그 (위치는 극좌표 → 직교, 거리 단위는 scene units)
    const catalog = [
        // ── 나선 은하 ────────────────────────────────────────────────────
        { tex: spiralGalaxyTex(0.3),  pos: [ 6800,  900, -4200], scale: 1200, op: 0.65 }, // M31 안드로메다
        { tex: spiralGalaxyTex(1.1),  pos: [-7200, -600,  3100], scale:  750, op: 0.48 }, // M33 삼각형자리
        { tex: spiralGalaxyTex(-0.5), pos: [ 4200, 2500,  7000], scale:  640, op: 0.42 }, // NGC 1300
        { tex: spiralGalaxyTex(0.8),  pos: [-5100, 3200, -6600], scale:  580, op: 0.38 }, // M81 보데
        { tex: spiralGalaxyTex(-1.2), pos: [ 9000, -700,  2000], scale:  520, op: 0.35 }, // M101 바람개비
        // ── 타원 은하 ────────────────────────────────────────────────────
        { tex: ellipticalGalaxyTex(), pos: [-5600, 1500, -6100], scale:  900, op: 0.55 }, // M87 처녀자리
        { tex: ellipticalGalaxyTex(), pos: [ 7800, -850,  1600], scale:  520, op: 0.40 }, // M60
        // ── 성운 ─────────────────────────────────────────────────────────
        { tex: nebulaTex(255,60,100, 80,40,200, 255,140,30),   pos: [-4200, 2000, -5500], scale: 950, op: 0.60 }, // M42 오리온
        { tex: nebulaTex(40,200,180, 30,80,220, 0,255,180),    pos: [ 3000,-2500, -7000], scale: 820, op: 0.55 }, // M16 독수리
        { tex: nebulaTex(255,110,20, 200,10,60, 255,180,0),    pos: [-6500,-1800,  4000], scale: 720, op: 0.50 }, // M1 게
        { tex: nebulaTex(160,60,255, 255,30,140, 60,120,255),  pos: [ 5600, 3600, -2100], scale: 640, op: 0.45 }, // NGC 6543 고양이눈
        // ── 산개/구상 성단 ────────────────────────────────────────────────
        { tex: starClusterTex(180,210,255), pos: [ 2800,-3500, -4500], scale: 540, op: 0.72 }, // M45 플레이아데스
        { tex: starClusterTex(255,240,200), pos: [-3600, 2900,  5100], scale: 460, op: 0.62 }, // M13 헤라클레스
        { tex: starClusterTex(200,255,220), pos: [ 6100,-2300,  3600], scale: 400, op: 0.55 }, // M22 궁수자리
    ];

    catalog.forEach(o => {
        const mat    = new THREE.SpriteMaterial({ map: o.tex, transparent: true, opacity: o.op, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(...o.pos);
        sprite.scale.set(o.scale, o.scale, 1);
        scene.add(sprite);
        deepSpaceObjects.push(sprite);
    });
}

// ── 행성 초기화 ──────────────────────────────────────────────────────
function initPlanets() {
    if (!compatibilities || !compatibilities.length) return;

    // 기존 오브젝트 제거
    planetSpheres.forEach(s => { if (s.parent) scene.remove(s.parent); });
    planetSpheres = [];
    planets.forEach(p => {
        if (p.labelDiv)   p.labelDiv.remove();
        if (p.statusDiv)  p.statusDiv.remove();
        if (p.orbitLine)  scene.remove(p.orbitLine);
    });

    initStars();
    initSolarBackground();
    initDeepSpaceObjects();

    const wrapper = document.querySelector('.universe-wrapper');
    const segs    = isMobile() ? 16 : 32;

    // 같은 궤도 그룹별로 360도 균등 배분 → 몇 명이든 절대 겹치지 않음
    const orbitGroups = {};
    compatibilities.forEach(c => {
        const k = Math.round(c.orbitRadius);
        if (!orbitGroups[k]) orbitGroups[k] = [];
        orbitGroups[k].push(c);
    });
    const planetAngles = new Map();
    Object.entries(orbitGroups).forEach(([key, group]) => {
        // 궤도마다 황금비 기반 시작 각도 (궤도별로 다른 시작점, 새로고침해도 동일)
        const baseAngle = (parseFloat(key) * 2.399963) % (Math.PI * 2);
        group.forEach((c, i) => {
            planetAngles.set(c, baseAngle + (Math.PI * 2 / group.length) * i);
        });
    });

    planets = compatibilities.map((c, i) => {
        const angle  = planetAngles.get(c);
        const radius = parseInt(c.planetSize) / 2;
        const orbit  = c.orbitRadius;

        const group = new THREE.Group();
        group.position.set(orbit * Math.cos(angle), 0, orbit * Math.sin(angle));

        // 행성 구체
        const color3 = new THREE.Color(c.planetColor);
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(radius, segs, segs),
            new THREE.MeshStandardMaterial({
                color: color3, emissive: color3, emissiveIntensity: 0.35,
                roughness: 0.45, metalness: 0.25
            })
        );
        group.add(sphere);

        // 온라인 링 (X-Z 평면에 평행)
        const onRing = new THREE.Mesh(
            new THREE.RingGeometry(radius + 3, radius + 7, 48),
            new THREE.MeshBasicMaterial({ color: 0x22C55E, transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        onRing.rotation.x = -Math.PI / 2;
        group.add(onRing);
        scene.add(group);

        // 행성 궤도 링 (scene 직속, 정적)
        const orbitPts = [];
        for (let j = 0; j <= 128; j++) {
            const a = (j / 128) * Math.PI * 2;
            orbitPts.push(new THREE.Vector3(Math.cos(a) * orbit, 0, Math.sin(a) * orbit));
        }
        const orbitLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(orbitPts),
            new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, dashSize: 4, gapSize: 8 })
        );
        orbitLine.computeLineDistances();
        scene.add(orbitLine);

        // DOM 이름 라벨 (매 프레임 화면 좌표로 위치 갱신)
        const labelDiv = document.createElement('div');
        labelDiv.className = 'planet-label-3d';
        labelDiv.textContent = c.partnerName;
        if (wrapper) wrapper.appendChild(labelDiv);

        // 상태메세지 서브 라벨
        let statusDiv = null;
        if (c.partnerStatus) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'planet-status-3d';
            statusDiv.textContent = c.partnerStatus;
            if (wrapper) wrapper.appendChild(statusDiv);
        }

        planetSpheres.push(sphere);

        return {
            id: c.id, partnerId: c.partnerId, name: c.partnerName,
            rank: c.rank, score: c.score, scoreLabel: c.scoreLabel,
            color: c.planetColor, size: radius,
            baseOrbit: orbit, angle,
            speed: 0.0003 + ((i * 0.00007) % 0.0002),
            x: 0, y: 0, hovered: false,
            gender: c.gender || '', emoji: c.partnerEmoji || null,
            status: c.partnerStatus || null,
            group, sphere, onRing, labelDiv, statusDiv, orbitLine,
            _scaleTarget: 1.0
        };
    });
}

// ── 음성 파동 오버레이 (render보다 먼저 정의) ────────────────────────
function drawVoiceWaves() {
    if (!overlayCtx || voiceWaveRings.length === 0) return;
    const cx = overlayCanvas.width  / 2;
    const cy = overlayCanvas.height / 2;
    for (let i = voiceWaveRings.length - 1; i >= 0; i--) {
        const ring = voiceWaveRings[i];
        if (ring.delay > 0) { ring.delay--; continue; }
        ring.r     += ring.speed;
        ring.alpha -= 0.008;
        if (ring.alpha <= 0) { voiceWaveRings.splice(i, 1); continue; }
        overlayCtx.beginPath();
        overlayCtx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        overlayCtx.strokeStyle = `rgba(167,139,250,${ring.alpha.toFixed(3)})`;
        overlayCtx.lineWidth   = 2;
        overlayCtx.stroke();
    }
}

// ── 렌더 루프 ────────────────────────────────────────────────────────
function render() {
    // 별 트윙클
    if (starField) starField.material.opacity = 0.6 + 0.35 * Math.abs(Math.sin(Date.now() * 0.0004));

    planets.forEach(p => {
        // 공전 (Big Bang 중에는 updateBigBang3D 가 위치 제어)
        if (!bigBangActive) {
            p.angle += p.speed;
            p.group.position.set(
                p.baseOrbit * Math.cos(p.angle), 0,
                p.baseOrbit * Math.sin(p.angle)
            );
        }

        // hover 스케일 lerp
        p._scaleTarget = p.hovered ? 1.3 : 1.0;
        const cur = p.sphere.scale.x;
        p.sphere.scale.setScalar(cur + (p._scaleTarget - cur) * 0.15);

        // 온라인 링 + 구체 글로우 맥박
        const isOnline = onlinePartnerIds.has(Number(p.partnerId));
        if (isOnline) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.0025 + p.partnerId);
            p.onRing.material.opacity = 0.55 + pulse * 0.45;
            p.sphere.material.emissiveIntensity = 0.35 + pulse * 0.45;
        } else {
            p.onRing.material.opacity = 0;
            p.sphere.material.emissiveIntensity = 0.2;
        }

        // 화면 좌표 계산 (이모지·말풍선·수퍼노바가 p.x/p.y 사용)
        const vec = p.group.position.clone().project(camera);
        p.x = (vec.x + 1) / 2 * canvas.clientWidth;
        p.y = -(vec.y - 1) / 2 * canvas.clientHeight;

        // DOM 라벨 위치 갱신
        if (p.labelDiv) {
            p.labelDiv.textContent = p.hovered ? `${p.score}점` : p.name;
            p.labelDiv.classList.toggle('hovered', p.hovered);
            p.labelDiv.style.left = p.x + 'px';
            p.labelDiv.style.top  = (p.y + p.size + 12) + 'px';
        }
        if (p.statusDiv) {
            p.statusDiv.style.left    = p.x + 'px';
            p.statusDiv.style.top     = (p.y + p.size + 27) + 'px';
            p.statusDiv.style.display = p.hovered ? 'none' : '';
        }
    });

    // Overlay canvas (별똥별·말풍선·이모지)
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        drawShootingStars();
        drawSpeechBubbles();
        drawEmojiParticles();
        drawVoiceWaves();
    }

    if (bigBangActive) updateBigBang3D();
    updateSupernovaEffects3D();
    updateSpaceObjects3D();

    // 카메라 제어: 제스처(지속 상태) > 자동 회전
    if (gestureActive && handPresent) {
        switch (currentGestureState) {
            case 'ROTATE_LEFT':  cameraAzimuth -= 0.022; break;
            case 'ROTATE_RIGHT': cameraAzimuth += 0.022; break;
            case 'ZOOM_IN':  cameraDistance = Math.max(CAM_MIN, cameraDistance - 4); break;
            case 'ZOOM_OUT': cameraDistance = Math.min(CAM_MAX, cameraDistance + 4); break;
        }
    } else if (!isDragging) {
        cameraAzimuth += AUTO_ROTATE_SPEED;
    }
    // 음성 명령 impulse velocity (항상 적용, 서서히 감쇠)
    cameraAzimuth    += rotationVelocity;
    rotationVelocity *= 0.92;
    updateCameraPosition();

    renderer.render(scene, camera);
    animFrame = requestAnimationFrame(render);
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r   = Math.min(255, (num >> 16) + amount);
    const g   = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b   = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
}

// ── 이모지 파티클 ────────────────────────────────────────────────────
function triggerEmojiParticle(partnerId, emoji, incoming = false) {
    const cx     = overlayCanvas.width / 2;
    const cy     = overlayCanvas.height / 2;
    const planet = planets.find(p => Number(p.partnerId) === Number(partnerId));
    if (!planet) return;
    const startX = incoming ? planet.x : cx;
    const startY = incoming ? planet.y : cy;
    const endX   = incoming ? cx : planet.x;
    const endY   = incoming ? cy : planet.y;
    emojiParticles.push({
        startX, startY, endX, endY,
        cpX: (startX + endX) / 2 + (Math.random() - 0.5) * 80,
        cpY: Math.min(startY, endY) - 120,
        progress: 0, emoji
    });
}

function drawEmojiParticles() {
    if (!overlayCtx) return;
    for (let i = emojiParticles.length - 1; i >= 0; i--) {
        const p = emojiParticles[i];
        p.progress += 0.018;
        if (p.progress >= 1) { emojiParticles.splice(i, 1); continue; }
        const t     = p.progress;
        const x     = (1-t)*(1-t)*p.startX + 2*(1-t)*t*p.cpX + t*t*p.endX;
        const y     = (1-t)*(1-t)*p.startY + 2*(1-t)*t*p.cpY + t*t*p.endY;
        const alpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
        const scale = 1 + Math.sin(t * Math.PI) * 0.6;
        overlayCtx.save();
        overlayCtx.globalAlpha    = alpha;
        overlayCtx.font           = `${26 * scale}px Arial`;
        overlayCtx.textAlign      = 'center';
        overlayCtx.textBaseline   = 'middle';
        overlayCtx.fillText(p.emoji, x, y);
        overlayCtx.restore();
    }
}

function extractEmoji(msg) {
    const match = msg.match(/\p{Emoji_Presentation}|\p{Emoji}️/gu);
    return match ? match[0] : '✉️';
}

// ── 마우스 드래그 회전 ────────────────────────────────────────────────
let isDragging  = false;
let dragLastX   = 0;
let dragMoved   = false;

canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isDragging = true;
    dragLastX  = e.clientX;
    dragMoved  = false;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mouseup',    () => { isDragging = false; canvas.style.cursor = 'default'; });
canvas.addEventListener('mouseleave', () => { isDragging = false; canvas.style.cursor = 'default'; });

// ── 마우스 이벤트 (Raycaster + 드래그) ────────────────────────────────
canvas.addEventListener('mousemove', e => {
    if (isDragging) {
        const dx = e.clientX - dragLastX;
        if (Math.abs(dx) > 2) dragMoved = true;
        cameraAzimuth += dx * 0.005;
        dragLastX = e.clientX;
        return;
    }
    const rect = canvas.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit       = raycaster.intersectObjects(planetSpheres);
    const hitSphere = hit.length ? hit[0].object : null;
    let any = false;
    planets.forEach(p => { p.hovered = (p.sphere === hitSphere); if (p.hovered) any = true; });
    canvas.style.cursor = any ? 'pointer' : 'default';
});

canvas.addEventListener('click', e => {
    if (dragMoved) { dragMoved = false; return; }
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    // 별똥별 클릭 체크 (소원 입력)
    let wishHit = false;
    shootingStars.forEach(s => { if (Math.hypot(mx - s.x, my - s.y) < 20 && s.alpha > 0.3) wishHit = true; });
    if (wishHit) { showWishInput(); return; }

    // 행성 클릭
    mouse.x =  (mx / rect.width)  * 2 - 1;
    mouse.y = -(my / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(planetSpheres);
    if (hit.length) {
        const p = planets.find(p => p.sphere === hit[0].object);
        if (p) openChatFromPlanet(p);
    }
});

// ── 마우스 휠 줌 ────────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    setScale(e.deltaY < 0 ? 1.12 : 0.9);
}, { passive: false });

// ── 터치 (핀치 줌 + 탭 클릭) ──────────────────────────────────────────
let lastPinchDist = 0;
let pinching      = false;

let touchDragLastX = 0;

canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                                   e.touches[0].clientY - e.touches[1].clientY);
        pinching = true;
    } else if (e.touches.length === 1) {
        touchDragLastX = e.touches[0].clientX;
        dragMoved = false;
    }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinching) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                             e.touches[0].clientY - e.touches[1].clientY);
        if (lastPinchDist > 0) setScale(d / lastPinchDist);
        lastPinchDist = d;
    } else if (e.touches.length === 1 && !pinching) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchDragLastX;
        if (Math.abs(dx) > 2) dragMoved = true;
        cameraAzimuth += dx * 0.005;
        touchDragLastX = e.touches[0].clientX;
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (pinching) { pinching = false; lastPinchDist = 0; return; }
    if (e.changedTouches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        mouse.x =  ((e.changedTouches[0].clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.changedTouches[0].clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObjects(planetSpheres);
        if (hit.length) {
            const p = planets.find(p => p.sphere === hit[0].object);
            if (p) openChatFromPlanet(p);
        }
    }
});

// ── 줌 버튼 ─────────────────────────────────────────────────────────
document.getElementById('zoomIn')?.addEventListener('click',    () => setScale(1.2));
document.getElementById('zoomOut')?.addEventListener('click',   () => setScale(0.8));
document.getElementById('zoomReset')?.addEventListener('click', () => {
    cameraDistance = 1000; updateCameraPosition(); updateZoomButtons();
});

// ── 목록 토글 ───────────────────────────────────────────────────────
const scoreList     = document.getElementById('scoreList');
const drawerToggle  = document.getElementById('drawerToggle');
const desktopToggle = document.getElementById('scoreListToggle');

if (drawerToggle && scoreList) {
    drawerToggle.addEventListener('click', () => {
        scoreList.classList.toggle('expanded');
        drawerToggle.textContent = scoreList.classList.contains('expanded') ? '▼ 접기' : '▲ 목록';
    });
}

function toggleScoreList() {
    if (!scoreList) return;
    scoreList.classList.toggle('collapsed');
    if (desktopToggle) desktopToggle.textContent = scoreList.classList.contains('collapsed') ? '∨' : '∧';
}

// ── 상세 모달 ───────────────────────────────────────────────────────
function showDetail(id) {
    fetch(`/compatibility/${id}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('modalName').textContent     = data.partnerName;
            document.getElementById('modalLabel').textContent    = data.scoreLabel;
            document.getElementById('modalScore').textContent    = data.score;
            document.getElementById('modalGender').textContent   = data.partnerGender === 'MALE' ? '남성' : '여성';
            document.getElementById('modalZodiac').textContent   = data.partnerZodiac + '띠';
            document.getElementById('modalDate').textContent     = data.createdAt;
            document.getElementById('modalAnalysis').textContent = data.analysisText || '분석 중...';

            const planet = planets.find(p => p.id === id);
            const color  = planet ? planet.color : '#A855F7';
            const mp     = document.getElementById('modalPlanet');
            mp.style.background = `radial-gradient(circle at 35% 35%, ${lightenColor(color, 40)}, ${color})`;
            mp.style.boxShadow  = `0 0 20px ${color}66`;
            mp.style.overflow   = 'hidden';

            if (data.partnerProfileImage) {
                mp.innerHTML = `<img src="/uploads/${data.partnerProfileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            } else {
                mp.innerHTML = `<span style="font-size:13px;font-weight:800;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.5)">${data.rank}위</span>`;
            }

            document.getElementById('zodiacBar').style.width      = (data.zodiacScore || 0) + '%';
            document.getElementById('numerologyBar').style.width  = (data.numerologyScore || 0) + '%';
            document.getElementById('elementBar').style.width     = (data.elementScore || 0) + '%';
            document.getElementById('zodiacScore').textContent    = data.zodiacScore || 0;
            document.getElementById('numerologyScore').textContent = data.numerologyScore || 0;
            document.getElementById('elementScore').textContent   = data.elementScore || 0;

            const bonusPct   = Math.min(100, (data.chatBonus || 0) * 3);
            const bonusBar   = document.getElementById('chatBonusBar');
            const bonusScore = document.getElementById('chatBonusScore');
            if (bonusBar)   bonusBar.style.width   = bonusPct + '%';
            if (bonusScore) bonusScore.textContent = '+' + (data.chatBonus || 0);

            const daysEl = document.getElementById('modalDays');
            if (daysEl && data.createdAt) {
                const diff = Math.floor((Date.now() - new Date(data.createdAt).getTime()) / 86400000);
                daysEl.textContent = 'D+' + diff;
            }

            const modal = document.getElementById('detailModal');
            modal.classList.add('active');
            modal._currentData = data;

            fetch(`/api/chat/stats/${data.partnerId}`)
                .then(r => r.json())
                .then(counts => drawWeeklyChart(counts))
                .catch(() => {});
        })
        .catch(() => showToast('상세 정보를 불러오지 못했습니다.'));
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('detailModal')) {
        document.getElementById('detailModal').classList.remove('active');
    }
}

function captureResult() {
    const card = document.getElementById('modalContent');
    html2canvas(card, { backgroundColor: '#0F0F28', scale: 2, useCORS: true }).then(cvs => {
        const link = document.createElement('a');
        const data = document.getElementById('detailModal')._currentData;
        link.download = `gravity-${data ? data.partnerName : 'result'}.png`;
        link.href = cvs.toDataURL('image/png');
        link.click();
        showToast('이미지가 저장되었습니다!');
    });
}

function shareResult() {
    const data = document.getElementById('detailModal')._currentData;
    if (!data) return;
    const text = `🪐 Gravity 끌림 분석\n${currentUserName} ♡ ${data.partnerName}\n끌림 지수: ${data.score}점 (${data.scoreLabel})\n\n${data.analysisText ? data.analysisText.slice(0, 100) + '...' : ''}`;
    if (navigator.share) {
        navigator.share({ title: 'Gravity 끌림 분석', text }).catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('결과가 클립보드에 복사되었습니다!'))
        .catch(() => showToast('공유에 실패했습니다.'));
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addEventListener('resize', () => { cancelAnimationFrame(animFrame); resizeRenderer(); requestAnimationFrame(render); });

updateZoomButtons();
scheduleShootingStar();
scheduleSpaceObject();

const params = new URLSearchParams(window.location.search);
const newId  = params.get('new');
if (newId) setTimeout(() => showDetail(parseInt(newId)), 800);

resizeRenderer();
if (isMobile()) initMobileSheet();
// requestAnimationFrame으로 감싸 브라우저 레이아웃 완료 후 첫 렌더링
// (canvas.clientWidth = 0 race condition 방지 — 특히 iOS Safari 첫 방문)
requestAnimationFrame(render);

// ── 채팅 ──────────────────────────────────────────────────────────────

function toggleChat() {
    if (isMobile()) { setSheetTab('chat'); return; }
    chatOpen = !chatOpen;
    const body = document.getElementById('chatBody');
    const btn  = document.getElementById('chatToggleBtn');
    body.style.display = chatOpen ? 'flex' : 'none';
    btn.textContent    = chatOpen ? '∨' : '∧';
    if (chatOpen) { unreadCount = 0; updateBadge(); }
}

let _chatCompatId = null;  // ℹ️ 버튼용 현재 채팅 상대 궁합 id

function openChatFromPlanet(p) {
    // 채팅 패널 열기
    if (!isMobile() && !chatOpen) {
        chatOpen = true;
        document.getElementById('chatBody').style.display = 'flex';
        document.getElementById('chatToggleBtn').textContent = '∨';
    }
    // 헤더 채우기
    const planetEl = document.getElementById('chatRoomPlanet');
    const scoreEl  = document.getElementById('chatRoomScore');
    if (planetEl) planetEl.textContent = p.emoji || '🪐';
    if (scoreEl)  { scoreEl.textContent = p.score + '점'; scoreEl.style.color = p.color || '#A855F7'; }
    _chatCompatId = p.id;
    openChat(p.partnerId, p.name);
}

function showDetailFromChat() {
    if (_chatCompatId) showDetail(_chatCompatId);
}

function openChat(partnerId, partnerName) {
    currentPartnerId   = partnerId;
    currentPartnerName = partnerName;
    document.getElementById('chatPartners').style.display = 'none';
    document.getElementById('chatRoom').style.display     = 'flex';
    document.getElementById('chatRoomTitle').textContent  = partnerName;
    document.getElementById('chatTitle').textContent      = partnerName;
    document.getElementById('chatMessages').innerHTML     = '';
    fetch(`/api/chat/read/${partnerId}`, { method: 'POST' });
    loadMessages();
    startPolling();
    if (isMobile()) setSheetTab('chat');
}

function backToPartners() {
    currentPartnerId = null;
    document.getElementById('chatPartners').style.display = 'block';
    document.getElementById('chatRoom').style.display     = 'none';
    document.getElementById('chatTitle').textContent      = '채팅';
    stopPolling();
}

function loadMessages() {
    if (!currentPartnerId) return;
    fetch(`/api/chat/${currentPartnerId}`)
        .then(r => r.json())
        .then(msgs => {
            const box = document.getElementById('chatMessages');
            box.innerHTML = '';
            msgs.forEach(m => appendMessage(m, false));
            box.scrollTop = box.scrollHeight;
            if (msgs.length > 0) lastMessageTime = msgs[msgs.length - 1].createdAtIso || nowKST();
        });
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';

    if (msg === '/bigbang')   { triggerBigBang();   if (currentPartnerId) sendEffect('BIGBANG',   currentPartnerId); return; }
    if (msg === '/supernova') { triggerSupernova(); if (currentPartnerId) sendEffect('SUPERNOVA', currentPartnerId); return; }

    if (!currentPartnerId) return;
    fetch(`/api/chat/${currentPartnerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    })
    .then(r => r.json())
    .then(m => {
        appendMessage(m);
        const box = document.getElementById('chatMessages');
        box.scrollTop = box.scrollHeight;
        lastMessageTime = m.createdAtIso || nowKST();
        triggerSpeechBubble(currentPartnerId, msg);
        triggerEmojiParticle(currentPartnerId, extractEmoji(msg));
    });
}

function appendMessage(m, animate = true) {
    const box  = document.getElementById('chatMessages');
    const last = box.lastElementChild;
    const consecutive = last && last.dataset.senderId == m.senderId && last.dataset.timeMin === m.createdAt;
    if (consecutive) {
        const prevTime = last.querySelector('.chat-time');
        if (prevTime) prevTime.style.display = 'none';
    }
    const div = document.createElement('div');
    div.className  = 'chat-msg ' + (m.mine ? 'chat-msg-mine' : 'chat-msg-other')
        + (consecutive ? ' chat-msg-consecutive' : '')
        + (animate     ? ' chat-msg-new'         : '');
    div.dataset.senderId = m.senderId;
    div.dataset.timeMin  = m.createdAt;
    div.dataset.msgId    = m.id;
    const readMark = m.mine ? `<span class="chat-read-mark${m.read ? ' read' : ''}">읽음</span>` : '';
    div.innerHTML = `<span class="chat-bubble">${escapeHtml(m.message)}</span>${readMark}<span class="chat-time">${m.createdAt}</span>`;
    box.appendChild(div);
}

function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function startPolling() {
    stopPolling();
    pollInterval = setInterval(pollNewMessages, 1500);
}

function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

function pollNewMessages() {
    fetch(`/api/chat/new?since=${encodeURIComponent(lastMessageTime)}`)
        .then(r => r.json())
        .then(msgs => {
            if (!msgs.length) return;
            lastMessageTime = msgs[msgs.length - 1].createdAtIso || nowKST();
            msgs.forEach(m => {
                triggerEmojiParticle(m.senderId, extractEmoji(m.message), true);
                triggerSpeechBubble(m.senderId, m.message);
                if (currentPartnerId && m.senderId === currentPartnerId) {
                    appendMessage(m);
                    const box = document.getElementById('chatMessages');
                    box.scrollTop = box.scrollHeight;
                    markSentMessagesAsRead();
                } else {
                    unreadCount++;
                    updateBadge();
                }
            });
        });
}

function markSentMessagesAsRead() {
    document.querySelectorAll('#chatMessages .chat-msg-mine .chat-read-mark').forEach(el => el.classList.add('read'));
}

function updateBadge() {
    const badge = document.getElementById('chatBadge');
    if (badge) { badge.style.display = unreadCount > 0 ? 'inline-block' : 'none'; badge.textContent = unreadCount; }
    const mobileBadge = document.getElementById('mobileChatBadge');
    if (mobileBadge) { mobileBadge.style.display = unreadCount > 0 ? 'inline' : 'none'; mobileBadge.textContent = unreadCount; }
}

// ── 말풍선 (overlay canvas) ─────────────────────────────────────────
function triggerSpeechBubble(senderId, message) {
    const id     = Number(senderId);
    const planet = planets.find(p => Number(p.partnerId) === id || Number(p.id) === id);
    if (!planet) return;
    speechBubbles.push({
        planetRef: planet,
        message:   message.length > 20 ? message.slice(0, 20) + '…' : message,
        alpha:     1.0,
        createdAt: Date.now()
    });
}

function drawSpeechBubbles() {
    if (!overlayCtx) return;
    const now = Date.now();
    for (let i = speechBubbles.length - 1; i >= 0; i--) {
        const b   = speechBubbles[i];
        const age = now - b.createdAt;
        if (age > 4000) { speechBubbles.splice(i, 1); continue; }
        b.alpha = age < 3000 ? 1 : 1 - (age - 3000) / 1000;

        const bx  = b.planetRef.x + 20;
        const by  = b.planetRef.y - 55;
        const pad = 10;
        overlayCtx.font = `13px 'Noto Sans KR', sans-serif`;
        const tw  = overlayCtx.measureText(b.message).width;
        const bw  = tw + pad * 2;
        const bh  = 30;

        overlayCtx.save();
        overlayCtx.globalAlpha = b.alpha;

        // 말풍선 배경
        overlayCtx.fillStyle = 'rgba(255,255,255,0.95)';
        overlayCtx.beginPath();
        const r = 8;
        overlayCtx.moveTo(bx + r, by);
        overlayCtx.lineTo(bx + bw - r, by);
        overlayCtx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        overlayCtx.lineTo(bx + bw, by + bh - r);
        overlayCtx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        overlayCtx.lineTo(bx + r, by + bh);
        overlayCtx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        overlayCtx.lineTo(bx, by + r);
        overlayCtx.quadraticCurveTo(bx, by, bx + r, by);
        overlayCtx.closePath();
        overlayCtx.fill();

        // 꼬리
        overlayCtx.beginPath();
        overlayCtx.moveTo(bx + 10, by + bh);
        overlayCtx.lineTo(bx + 2,  by + bh + 8);
        overlayCtx.lineTo(bx + 18, by + bh);
        overlayCtx.fillStyle = 'rgba(255,255,255,0.95)';
        overlayCtx.fill();

        // 텍스트
        overlayCtx.fillStyle    = '#1e1e3f';
        overlayCtx.textAlign    = 'left';
        overlayCtx.textBaseline = 'middle';
        overlayCtx.fillText(b.message, bx + pad, by + bh / 2);
        overlayCtx.restore();
    }
}

// ── 별똥별 소원 ─────────────────────────────────────────────────────
function showWishInput() {
    const existing = document.getElementById('wishInputBox');
    if (existing) return;
    const box = document.createElement('div');
    box.id = 'wishInputBox';
    box.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(10,10,35,0.95);border:1px solid rgba(255,230,100,0.4);
        border-radius:16px;padding:20px 24px;z-index:999;text-align:center;
        box-shadow:0 0 30px rgba(255,200,50,0.2);min-width:280px`;
    box.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px">🌠</div>
        <div style="color:#FFE08A;font-size:14px;margin-bottom:12px;font-weight:600">별똥별에 소원을 빌어요</div>
        <input id="wishText" maxlength="30" placeholder="소원을 입력하세요..."
            style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,230,100,0.3);
            border-radius:8px;padding:8px 12px;color:white;font-size:13px;outline:none;
            font-family:'Noto Sans KR',sans-serif;box-sizing:border-box">
        <div style="display:flex;gap:8px;margin-top:12px">
            <button onclick="submitWish()" style="flex:1;background:linear-gradient(135deg,#F59E0B,#FBBF24);
                border:none;border-radius:8px;padding:8px;color:white;font-weight:700;cursor:pointer;font-size:13px">빌기 ✨</button>
            <button onclick="document.getElementById('wishInputBox').remove()" style="flex:1;background:rgba(255,255,255,0.1);
                border:none;border-radius:8px;padding:8px;color:#94A3B8;cursor:pointer;font-size:13px">취소</button>
        </div>`;
    document.body.appendChild(box);
    document.getElementById('wishText').focus();
    document.getElementById('wishText').addEventListener('keydown', ev => { if (ev.key === 'Enter') submitWish(); });
}

function submitWish() {
    const text = document.getElementById('wishText')?.value?.trim();
    if (!text) return;
    document.getElementById('wishInputBox')?.remove();
    fetch('/api/wish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
        .then(() => { spawnWishStar(text); showToast('🌠 소원이 하늘로 날아갔어요!'); });
}

function spawnWishStar(text) {
    shootingStars.push({
        x: 0, y: Math.random() * overlayCanvas.height * 0.4,
        len: Math.random() * 120 + 80, speed: Math.random() * 6 + 5,
        alpha: 1, angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        width: 2, wish: text
    });
}

function pollWishes() {
    fetch('/api/wish/active')
        .then(r => r.json())
        .then(wishes => {
            wishes.forEach(w => {
                const key = w.userName + w.text;
                if (!wishShownIds.has(key)) {
                    wishShownIds.add(key);
                    spawnWishStar(`${w.userName}: ${w.text}`);
                    setTimeout(() => wishShownIds.delete(key), 30000);
                }
            });
        })
        .catch(() => {});
}
pollWishes();
setInterval(pollWishes, 5000);

window.submitWish   = submitWish;
window.showWishInput = showWishInput;

// 온라인 상태 폴링
function pollOnlineStatus() {
    fetch('/api/chat/online')
        .then(r => r.json())
        .then(ids => { onlinePartnerIds = new Set(ids.map(Number)); })
        .catch(() => {});
}
pollOnlineStatus();
setInterval(pollOnlineStatus, 30000);

// 특수 효과 폴링
function sendEffect(type, receiverId) {
    fetch('/api/effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, receiverId: Number(receiverId) })
    });
}

function pollEffects() {
    fetch('/api/effect/poll')
        .then(r => r.json())
        .then(effects => {
            effects.forEach(e => {
                if (e.type === 'BIGBANG')   triggerBigBang();
                if (e.type === 'SUPERNOVA') triggerSupernovaOnPlanet(e.senderId);
            });
        })
        .catch(() => {});
}
setInterval(pollEffects, 3000);

// ── 이스터에그 ──────────────────────────────────────────────────────────

function triggerSupernovaOnPlanet(senderId) {
    const planet = planets.find(p => Number(p.partnerId) === Number(senderId));
    const pos    = planet ? planet.group.position.clone() : new THREE.Vector3(0, 0, 0);
    const mesh   = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xFFFFCC, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    mesh.position.copy(pos);
    scene.add(mesh);
    supernovaEffects.push({ frame: 0, maxFrame: 80, scale: 10, mesh });
}

function triggerBigBang() {
    if (bigBangActive) return;
    bigBangActive = true;
    bigBangPhase  = 0;
    bigBangTimer  = 0;
    showToast('💥 BIGBANG!!!');

    originalPlanetPositions = planets.map(p => ({ angle: p.angle, baseOrbit: p.baseOrbit }));

    // 3D 파티클 시스템
    const count     = 120;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const colorList = [
        [1, 0.42, 0.42], [1, 0.9, 0.43], [0.31, 0.8, 0.77],
        [0.65, 0.55, 0.98], [0.98, 0.66, 0.79], [0.49, 0.83, 0.99]
    ];
    bigBangVelocities = [];
    for (let i = 0; i < count; i++) {
        positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
        const cl = colorList[i % colorList.length];
        colors[i*3] = cl[0]; colors[i*3+1] = cl[1]; colors[i*3+2] = cl[2];
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 18 + 6;
        bigBangVelocities.push({ vx: Math.cos(a) * s, vz: Math.sin(a) * s });
    }
    const bbGeom = new THREE.BufferGeometry();
    bbGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bbGeom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    bigBangPoints = new THREE.Points(bbGeom,
        new THREE.PointsMaterial({ size: 5, vertexColors: true, transparent: true, opacity: 1 })
    );
    scene.add(bigBangPoints);

    // 행성 폭발 방향
    planets.forEach(p => {
        const pos = p.group.position;
        const len = Math.sqrt(pos.x * pos.x + pos.z * pos.z) || 1;
        p._bbVx = (pos.x / len) * 25;
        p._bbVz = (pos.z / len) * 25;
    });

    // 화이트 플래시
    bigBangFlashDiv.style.opacity = '0.85';
    setTimeout(() => { bigBangFlashDiv.style.opacity = '0'; }, 400);
}

function updateBigBang3D() {
    bigBangTimer++;

    // 파티클 위치 업데이트
    if (bigBangPoints) {
        const pos = bigBangPoints.geometry.attributes.position;
        bigBangVelocities.forEach((v, i) => {
            pos.array[i*3]   += v.vx;
            pos.array[i*3+2] += v.vz;
            v.vx *= 0.96; v.vz *= 0.96;
        });
        pos.needsUpdate = true;
        bigBangPoints.material.opacity = Math.max(0, 1 - bigBangTimer / 180);
    }

    // 페이즈 1 (0~60): 폭발
    if (bigBangTimer < 60) {
        planets.forEach(p => {
            p.group.position.x += p._bbVx || 0;
            p.group.position.z += p._bbVz || 0;
            if (p._bbVx) p._bbVx *= 0.95;
            if (p._bbVz) p._bbVz *= 0.95;
        });
    }

    // 페이즈 2 (60~180): 원위치 복귀
    if (bigBangTimer >= 60) {
        planets.forEach((p, i) => {
            const orig = originalPlanetPositions[i];
            if (!orig) return;
            const tx = orig.baseOrbit * Math.cos(orig.angle);
            const tz = orig.baseOrbit * Math.sin(orig.angle);
            p.group.position.x += (tx - p.group.position.x) * 0.07;
            p.group.position.z += (tz - p.group.position.z) * 0.07;
        });
    }

    // 종료
    if (bigBangTimer >= 180) {
        bigBangActive = false;
        if (bigBangPoints) { scene.remove(bigBangPoints); bigBangPoints = null; }
        planets.forEach(p => { delete p._bbVx; delete p._bbVz; });
    }
}

function triggerSupernova() {
    showToast('🌟 SUPERNOVA!');
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xFFFFCC, transparent: true, opacity: 0.6 })
    );
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
    supernovaEffects.push({ frame: 0, maxFrame: 80, scale: 12, mesh });
}

function updateSupernovaEffects3D() {
    for (let i = supernovaEffects.length - 1; i >= 0; i--) {
        const s = supernovaEffects[i];
        s.frame++;
        if (s.frame > s.maxFrame) {
            if (s.mesh) scene.remove(s.mesh);
            supernovaEffects.splice(i, 1);
            continue;
        }
        const progress = s.frame / s.maxFrame;
        if (s.mesh) {
            s.mesh.scale.setScalar(1 + progress * s.scale);
            s.mesh.material.opacity = (1 - progress) * 0.6;
        }
    }
}

// ── 모바일 통합 시트 ────────────────────────────────────────────────
let sheetExpanded  = false;
let sheetActiveTab = 'list';

function initMobileSheet() {
    const sheet = document.createElement('div');
    sheet.className = 'mobile-sheet';
    sheet.id        = 'mobileSheet';
    sheet.innerHTML = `
        <div class="sheet-drag-handle" id="sheetDragHandle" onclick="toggleMobileSheet()">
            <span class="sheet-drag-label" id="sheetLabel">▲ 내 우주</span>
        </div>
        <div class="sheet-tab-bar" id="sheetTabBar" style="display:none">
            <button class="sheet-tab-btn active" id="sheetTabList" onclick="setSheetTab('list')">🌌 내 우주</button>
            <button class="sheet-tab-btn" id="sheetTabChat" onclick="setSheetTab('chat')">
                💬 채팅 <span class="sheet-tab-badge" id="mobileChatBadge" style="display:none">0</span>
            </button>
        </div>
        <div class="sheet-content" id="sheetContent"></div>
    `;
    document.body.appendChild(sheet);

    const sheetContent = document.getElementById('sheetContent');
    const scoreListEl  = document.getElementById('scoreList');
    if (scoreListEl) {
        scoreListEl.style.cssText = 'position:static;width:100%;max-height:none;border-radius:0;box-shadow:none;padding:0;display:none;';
        sheetContent.appendChild(scoreListEl);
    }
    const chatBodyEl = document.getElementById('chatBody');
    if (chatBodyEl) {
        chatBodyEl.style.display = 'none';
        sheetContent.appendChild(chatBodyEl);
    }

    // Three.js renderer 크기 재측정
    requestAnimationFrame(() => {
        cancelAnimationFrame(animFrame);
        resizeRenderer();
        render();
    });
}

function toggleMobileSheet() {
    const sheet  = document.getElementById('mobileSheet');
    const tabBar = document.getElementById('sheetTabBar');
    const label  = document.getElementById('sheetLabel');
    if (!sheet) return;
    sheetExpanded = !sheetExpanded;
    sheet.classList.toggle('expanded', sheetExpanded);
    if (tabBar) tabBar.style.display = sheetExpanded ? 'flex' : 'none';
    if (label)  label.textContent    = sheetExpanded ? '▼ 닫기' : '▲ 내 우주';
    if (!sheetExpanded) setSheetTab('list', false);
}

function setSheetTab(tab, expand = true) {
    sheetActiveTab = tab;
    if (expand && !sheetExpanded) toggleMobileSheet();
    const scoreListEl = document.getElementById('scoreList');
    const chatBodyEl  = document.getElementById('chatBody');
    const tabList = document.getElementById('sheetTabList');
    const tabChat = document.getElementById('sheetTabChat');
    if (tab === 'list') {
        if (scoreListEl) { scoreListEl.style.display = 'block'; scoreListEl.style.visibility = 'visible'; }
        if (chatBodyEl)  chatBodyEl.style.display = 'none';
        if (tabList) tabList.classList.add('active');
        if (tabChat) tabChat.classList.remove('active');
    } else {
        if (scoreListEl) scoreListEl.style.display = 'none';
        if (chatBodyEl)  { chatBodyEl.style.display = 'flex'; chatBodyEl.style.flexDirection = 'column'; }
        if (tabList) tabList.classList.remove('active');
        if (tabChat) tabChat.classList.add('active');
        unreadCount = 0;
        updateBadge();
    }
}

function drawWeeklyChart(counts) {
    const cvs = document.getElementById('weeklyChartCanvas');
    if (!cvs) return;
    // CSS 표시 크기에 내부 해상도를 맞춤 (width:100% 늘림 대응)
    cvs.width  = cvs.offsetWidth  || 260;
    cvs.height = cvs.offsetHeight || 80;
    const c  = cvs.getContext('2d');
    const W  = cvs.width, H = cvs.height;
    c.clearRect(0, 0, W, H);
    const max    = Math.max(...counts, 1);
    const barW   = W / counts.length * 0.55;
    const gap    = W / counts.length;
    const labels = ['3주전','2주전','1주전','이번주'];
    counts.forEach((v, i) => {
        const bh   = (v / max) * (H - 28);
        const x    = i * gap + gap * 0.225;
        const y    = H - 20 - bh;
        const grad = c.createLinearGradient(x, y, x, H - 20);
        grad.addColorStop(0, '#A78BFA');
        grad.addColorStop(1, '#7C3AED44');
        c.fillStyle = grad;
        c.beginPath();
        c.roundRect(x, y, barW, bh, 3);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.font = '9px sans-serif';
        c.textAlign = 'center';
        c.fillText(labels[i], x + barW / 2, H - 4);
        if (v > 0) {
            c.fillStyle = 'rgba(255,255,255,0.8)';
            c.font = 'bold 10px sans-serif';
            c.fillText(v, x + barW / 2, y - 4);
        }
    });
}

// 전역 노출
window.toggleChat        = toggleChat;
window.openChat          = openChat;
window.openChatFromPlanet = openChatFromPlanet;
window.showDetailFromChat = showDetailFromChat;
window.backToPartners    = backToPartners;
window.sendChatMessage   = sendChatMessage;

// 모바일 키보드가 올라올 때 채팅 패널 위로 올리기
if (window.visualViewport) {
    function onViewportResize() {
        const panel = document.getElementById('chatPanel');
        if (!panel) return;
        const kbH = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
        panel.style.bottom = Math.max(0, kbH) + 'px';
    }
    window.visualViewport.addEventListener('resize', onViewportResize);
    window.visualViewport.addEventListener('scroll', onViewportResize);
}

// ── 웹캠 손 제스처 ────────────────────────────────────────────────────
// gestureActive / currentGestureState 는 상단에 선언됨 (TDZ 방지)
let gestureHands      = null;
let gestureStream     = null;
let gestureRAF        = null;
let gestureFrameBuf   = [];       // 최근 N프레임 제스처 버퍼
const GESTURE_CONFIRM = 5;        // 동일 제스처가 이 프레임 수 연속 감지돼야 확정

// display:none 비디오에서 MediaPipe로 프레임 전달용 오프스크린 캔버스
// (iOS 하드웨어 오버레이 완전 차단: display:none은 렌더링 트리에서 완전 제거)
let _gOffCanvas = null;
let _gOffCtx    = null;

// ── MediaPipe WASM 워밍업 ─────────────────────────────────────────
// 첫 방문 시 WASM 다운로드+컴파일에 수 초 걸림.
// 페이지 로드 직후 별도 인스턴스로 blank frame을 순차적으로 보내
// onResults 콜백이 올 때(= WASM 준비 완료)까지 대기.
// startGestureControl은 이 Promise를 await해서 준비된 상태로 시작.
let _wasmReady        = false;
let _wasmWarmupHands  = null;
let _wasmReadyPromise = null;

function ensureWasmReady() {
    if (_wasmReadyPromise) return _wasmReadyPromise;
    _wasmReadyPromise = new Promise(resolve => {
        if (typeof Hands === 'undefined') { resolve(); return; }
        try {
            const warmup = new Hands({
                locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
            });
            warmup.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.65, minTrackingConfidence: 0.5 });
            warmup.onResults(() => {
                if (_wasmReady) return;
                _wasmReady = true;
                resolve(); // startGestureControl의 await 해제
            });
            _wasmWarmupHands = warmup;
            const tmp = document.createElement('canvas');
            tmp.width = 4; tmp.height = 4;
            // 순차 전송 — await로 한 번에 하나씩만 보내 동시성 문제 방지
            (async () => {
                while (!_wasmReady) {
                    try { await warmup.send({ image: tmp }); } catch (_) {}
                    if (!_wasmReady) await new Promise(r => setTimeout(r, 300));
                }
            })();
        } catch (_) { resolve(); }
    });
    return _wasmReadyPromise;
}
setTimeout(ensureWasmReady, 300); // 페이지 로드 직후 백그라운드 시작

// 손가락 랜드마크 인덱스 (index, middle, ring, pinky)
const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_PIPS = [6, 10, 14, 18];

function detectGestureType(lm) {
    // 1) 손 기울기: wrist(0) → middle_mcp(9) 방향 벡터
    const hx  = lm[9].x - lm[0].x;
    const hy  = lm[9].y - lm[0].y;
    const len = Math.hypot(hx, hy) || 0.001;
    // tiltRatio: wrist 가 mcp 보다 오른쪽이면 양수(= 화면 기준 왼쪽 기울임)
    const tiltRatio = (lm[0].x - lm[9].x) / len;

    if (tiltRatio >  0.35) return 'ROTATE_LEFT';
    if (tiltRatio < -0.35) return 'ROTATE_RIGHT';

    // 2) 손 펼침/주먹: 4개 손가락 tip vs PIP 비교
    let extended = 0;
    for (let i = 0; i < 4; i++) {
        if (lm[FINGER_TIPS[i]].y < lm[FINGER_PIPS[i]].y - 0.02) extended++;
    }
    if (extended >= 3) return 'ZOOM_IN';
    if (extended <= 1) return 'ZOOM_OUT';
    return 'IDLE';
}

function toggleGestureControl() {
    gestureActive ? stopGestureControl() : startGestureControl();
}

async function startGestureControl() {
    const btn     = document.getElementById('gestureBtn');
    const labelEl = document.getElementById('gestureLabel');

    if (typeof Hands === 'undefined') {
        showToast('❌ 제스처 라이브러리 로드 중… 잠시 후 다시 시도하세요');
        return;
    }

    try {
        gestureStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
        });
    } catch (err) {
        showToast('카메라 접근 실패: ' + err.message);
        return;
    }

    const videoEl = document.getElementById('gestureVideo');
    videoEl.srcObject = gestureStream;
    try { await videoEl.play(); } catch (_) { /* 자동재생 정책 무시 — drawImage는 여전히 작동 */ }
    // play() 후 display:none — iOS 하드웨어 오버레이 완전 차단
    // getUserMedia 스트림은 hidden 상태에서도 내부 프레임 버퍼 계속 업데이트됨
    videoEl.style.display = 'none';
    if (!_gOffCanvas) {
        _gOffCanvas = document.createElement('canvas');
        _gOffCanvas.width = 320; _gOffCanvas.height = 240;
        _gOffCtx = _gOffCanvas.getContext('2d');
    }
    const gCvs = document.getElementById('gestureCanvas');
    if (gCvs) { gCvs.width = 200; gCvs.height = 150; }

    // 패널 즉시 표시 — 위치도 JS로 강제 (CSS 캐시/우선순위 무관하게 중앙 보장)
    const panel = document.getElementById('gesturePanel');
    panel.style.cssText = 'display:flex;position:fixed;bottom:80px;left:0;right:0;margin:0 auto;width:fit-content;transform:none;z-index:150;';
    if (btn) btn.classList.add('gesture-on');

    // WASM 미준비 시 로딩 대기 (최대 20초)
    if (!_wasmReady) {
        if (labelEl) labelEl.textContent = '⏳ 모델 로딩 중...';
        await Promise.race([ensureWasmReady(), new Promise(r => setTimeout(r, 20000))]);
    }

    // 워밍업 인스턴스 재사용 (WASM 이미 로드됨) — 없으면 새로 생성
    if (_wasmWarmupHands) {
        gestureHands = _wasmWarmupHands;
        _wasmWarmupHands = null;
    } else {
        gestureHands = new Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
        });
        gestureHands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.65, minTrackingConfidence: 0.5 });
    }
    gestureHands.onResults(onGestureResults);

    gestureActive = true;
    handPresent   = false;
    prevHandX     = null;
    if (labelEl) labelEl.textContent = '✋ 손을 보여주세요';
    showToast('✋ 손을 좌우로 움직여 태양계를 회전하세요');

    async function processFrame() {
        if (!gestureActive) return;
        if (videoEl.readyState >= 2) {
            // display:none 비디오 → 오프스크린 캔버스 경유 (하드웨어 오버레이 우회)
            _gOffCtx.drawImage(videoEl, 0, 0, 320, 240);
            try { await gestureHands.send({ image: _gOffCanvas }); } catch (_) {}
        }
        gestureRAF = requestAnimationFrame(processFrame);
    }
    processFrame();
}

function stopGestureControl() {
    gestureActive       = false;
    handPresent         = false;
    prevHandX           = null;
    currentGestureState = 'IDLE';
    gestureFrameBuf     = [];
    if (gestureRAF)    { cancelAnimationFrame(gestureRAF); gestureRAF = null; }
    if (gestureStream) { gestureStream.getTracks().forEach(t => t.stop()); gestureStream = null; }
    if (gestureHands)  { gestureHands.close(); gestureHands = null; }
    const videoEl = document.getElementById('gestureVideo');
    if (videoEl) { videoEl.srcObject = null; videoEl.style.display = ''; }
    const panel = document.getElementById('gesturePanel');
    panel.style.cssText = 'display:none;';
    const btn = document.getElementById('gestureBtn');
    if (btn) btn.classList.remove('gesture-on');
    showToast('손 제스처 회전 비활성화 — 자동 회전 복귀');
}

// MediaPipe 손 연결선 (21개 랜드마크)
const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
];

function drawHandLandmarks(landmarks) {
    const gCvs = document.getElementById('gestureCanvas');
    if (!gCvs) return;
    const ctx = gCvs.getContext('2d');
    const W = gCvs.width, H = gCvs.height;
    ctx.clearRect(0, 0, W, H);

    // 연결선
    ctx.strokeStyle = 'rgba(0,230,90,0.85)';
    ctx.lineWidth   = 1.8;
    HAND_CONNECTIONS.forEach(([a, b]) => {
        const lA = landmarks[a], lB = landmarks[b];
        ctx.beginPath();
        ctx.moveTo((1 - lA.x) * W, lA.y * H);  // 비디오가 CSS mirror이므로 x 반전
        ctx.lineTo((1 - lB.x) * W, lB.y * H);
        ctx.stroke();
    });

    // 랜드마크 점 (엄지 끝=4, 검지 끝=8 강조)
    landmarks.forEach((lm, i) => {
        const isPinch = i === 4 || i === 8;
        ctx.beginPath();
        ctx.arc((1 - lm.x) * W, lm.y * H, isPinch ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isPinch ? '#FFD700' : '#00E85A';
        ctx.fill();
    });
}

function onGestureResults(results) {
    const labelEl = document.getElementById('gestureLabel');
    const gCvs    = document.getElementById('gestureCanvas');

    // 손 없음 → 상태 초기화, 자동 회전 복귀
    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
        handPresent         = false;
        currentGestureState = 'IDLE';
        gestureFrameBuf     = [];
        if (gCvs) gCvs.getContext('2d').clearRect(0, 0, gCvs.width, gCvs.height);
        if (labelEl) labelEl.textContent = '✋ 손을 보여주세요';
        return;
    }

    handPresent = true;
    const lm = results.multiHandLandmarks[0];

    // 랜드마크 그리기
    drawHandLandmarks(lm);

    // 이번 프레임 제스처 감지
    const detected = detectGestureType(lm);

    // 버퍼에 추가, GESTURE_CONFIRM 프레임 유지
    gestureFrameBuf.push(detected);
    if (gestureFrameBuf.length > GESTURE_CONFIRM) gestureFrameBuf.shift();

    // 연속 N프레임 동일 제스처일 때만 확정
    if (gestureFrameBuf.length === GESTURE_CONFIRM &&
        gestureFrameBuf.every(g => g === detected)) {
        currentGestureState = detected;
    }

    // 라벨 표시
    if (labelEl) {
        const waiting = gestureFrameBuf.length < GESTURE_CONFIRM
            ? ` (${gestureFrameBuf.filter(g => g === detected).length}/${GESTURE_CONFIRM})` : '';
        const labels = {
            IDLE:         '손 인식 중 ✋',
            ZOOM_IN:      '🤚 손 펼침 — 줌인',
            ZOOM_OUT:     '✊ 주먹 — 줌아웃',
            ROTATE_LEFT:  '← 왼쪽 기울기',
            ROTATE_RIGHT: '→ 오른쪽 기울기',
        };
        labelEl.textContent = (labels[detected] || '손 인식 중 ✋') + waiting;
    }
}

window.toggleGestureControl = toggleGestureControl;

// 백그라운드 메시지 폴링
setInterval(() => {
    if (!currentPartnerId) {
        fetch(`/api/chat/new?since=${encodeURIComponent(lastMessageTime)}`)
            .then(r => r.json())
            .then(msgs => {
                if (!msgs.length) return;
                lastMessageTime = msgs[msgs.length - 1].createdAtIso || nowKST();
                msgs.forEach(m => { triggerSpeechBubble(m.senderId, m.message); unreadCount++; updateBadge(); });
            })
            .catch(() => {});
    }
}, 5000);

// ── 음성 어시스턴트 ────────────────────────────────────────────────────
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceListening        = false;
let voiceActive           = false;
let voiceRecognition      = null;
let voiceDeactivateTimer  = null;
let voiceSpawnInterval    = null;
// voiceWaveRings는 상단에 선언됨 (TDZ 방지)

function toggleVoiceAssistant() {
    voiceListening ? stopVoiceAssistant() : startVoiceAssistant();
}

function startVoiceAssistant() {
    if (!SpeechRecognitionAPI) {
        showToast('❌ 이 브라우저는 음성 인식을 지원하지 않아요 (Chrome 권장)');
        return;
    }
    voiceRecognition = new SpeechRecognitionAPI();
    voiceRecognition.lang            = 'ko-KR';
    voiceRecognition.continuous      = true;
    voiceRecognition.interimResults  = false;
    voiceRecognition.maxAlternatives = 2;

    voiceRecognition.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const text = e.results[i][0].transcript.trim();
            handleVoiceInput(text);
        }
    };
    voiceRecognition.onerror = e => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') showToast('🎤 음성 오류: ' + e.error);
    };
    voiceRecognition.onend = () => {
        if (voiceListening) setTimeout(() => { try { voiceRecognition.start(); } catch (_) {} }, 200);
    };
    voiceRecognition.start();

    voiceListening = true;
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.add('voice-listening');
    document.getElementById('voiceStatus').style.display = 'flex';
    document.getElementById('voiceStatusText').textContent = '"그래비티"라고 불러주세요';
    showToast('🎤 음성 어시스턴트 켜짐 — "그래비티"라고 불러주세요');
}

function stopVoiceAssistant() {
    voiceListening = false;
    voiceActive    = false;
    if (voiceRecognition) { try { voiceRecognition.stop(); } catch (_) {} voiceRecognition = null; }
    clearTimeout(voiceDeactivateTimer);
    clearInterval(voiceSpawnInterval);
    voiceSpawnInterval = null;
    voiceWaveRings.length = 0;
    document.querySelector('.center-planet')?.classList.remove('voice-active');
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.classList.remove('voice-listening'); btn.classList.remove('voice-on'); }
    document.getElementById('voiceStatus').style.display = 'none';
    showToast('🎤 음성 어시스턴트 꺼짐');
}

function handleVoiceInput(text) {
    const t = text.toLowerCase();
    if (!voiceActive) {
        if (t.includes('그래비티') || t.includes('gravity') || t.includes('그래 비티')) {
            activateVoiceMode();
        }
        return;
    }
    processVoiceCommand(t);
}

function activateVoiceMode() {
    voiceActive = true;
    clearTimeout(voiceDeactivateTimer);
    document.querySelector('.center-planet')?.classList.add('voice-active');
    spawnVoiceWaveSet();
    clearInterval(voiceSpawnInterval);
    voiceSpawnInterval = setInterval(spawnVoiceWaveSet, 700);
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.classList.add('voice-on'); btn.classList.remove('voice-listening'); }
    document.getElementById('voiceStatusText').textContent = '명령을 말씀하세요...';
    speak('네, 그래비티입니다. 무엇을 도와드릴까요?');
    voiceDeactivateTimer = setTimeout(deactivateVoiceMode, 5000);
}

function deactivateVoiceMode() {
    voiceActive = false;
    clearInterval(voiceSpawnInterval);
    voiceSpawnInterval = null;
    document.querySelector('.center-planet')?.classList.remove('voice-active');
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.classList.remove('voice-on'); if (voiceListening) btn.classList.add('voice-listening'); }
    document.getElementById('voiceStatusText').textContent = '"그래비티"라고 불러주세요';
}

function processVoiceCommand(t) {
    clearTimeout(voiceDeactivateTimer);
    let replied = false;

    if (t.includes('왼쪽') || t.includes('왼')) {
        rotationVelocity = -0.12;
        speak('왼쪽으로 회전합니다');
        replied = true;
    } else if (t.includes('오른쪽') || t.includes('오른')) {
        rotationVelocity = 0.12;
        speak('오른쪽으로 회전합니다');
        replied = true;
    } else if (t.includes('궤도') || t.includes('돌려') || t.includes('회전')) {
        rotationVelocity = 0.12;
        speak('궤도를 회전합니다');
        replied = true;
    } else if (t.includes('줌인') || t.includes('확대') || t.includes('크게')) {
        setScale(1.6);
        speak('확대합니다');
        replied = true;
    } else if (t.includes('줌아웃') || t.includes('축소') || t.includes('작게')) {
        setScale(0.6);
        speak('축소합니다');
        replied = true;
    } else if (t.includes('궁합') || t.includes('보여줘') || t.includes('보여')) {
        const top = planets[0];
        if (top) { showDetail(top.id); speak('궁합을 보여드릴게요'); }
        else speak('연결된 행성이 없어요');
        replied = true;
    } else if (t.includes('채팅') || t.includes('대화')) {
        if (!isMobile()) { chatOpen = false; toggleChat(); }
        else setSheetTab('chat');
        speak('채팅창을 열어드릴게요');
        replied = true;
    } else if (t.includes('접속') || t.includes('온라인') || t.includes('누가')) {
        const online = planets.filter(p => onlinePartnerIds.has(Number(p.partnerId)));
        highlightOnlinePlanets(online);
        speak(online.length ? online.map(p => p.name).join(', ') + ' 이 접속 중이에요' : '현재 접속 중인 행성이 없어요');
        replied = true;
    }

    if (replied) spawnVoiceWaveSet();
    voiceDeactivateTimer = setTimeout(deactivateVoiceMode, 3000);
}

function highlightOnlinePlanets(online) {
    (online || planets.filter(p => onlinePartnerIds.has(Number(p.partnerId)))).forEach(p => {
        let n = 0;
        const iv = setInterval(() => {
            p.onRing.material.opacity = n % 2 === 0 ? 1.0 : 0.2;
            if (++n >= 8) { clearInterval(iv); p.onRing.material.opacity = onlinePartnerIds.has(Number(p.partnerId)) ? 0.8 : 0; }
        }, 200);
    });
}

function spawnVoiceWaveSet() {
    for (let i = 0; i < 3; i++) {
        voiceWaveRings.push({ r: 30, alpha: 0.7 - i * 0.15, speed: 1.8 + i * 0.4, delay: i * 18 });
    }
}

function speak(text) {
    if (!window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'ko-KR';
    utt.rate  = 1.1;
    utt.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
}

window.toggleVoiceAssistant = toggleVoiceAssistant;
