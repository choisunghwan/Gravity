const canvas = document.getElementById('universeCanvas');
if (!canvas) throw new Error('canvas not found');

const ctx = canvas.getContext('2d');
let planets = [];
let stars = [];
let animFrame;
const imageCache = {};

// 채팅 관련 변수 (render보다 먼저 선언)
let chatOpen = false;
let currentPartnerId = null;
let currentPartnerName = null;
function nowKST() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
}
let lastMessageTime = nowKST();
let pollInterval = null;
let unreadCount = 0;
const speechBubbles = [];
let onlinePartnerIds = new Set();

// 이모지 파티클
const emojiParticles = [];

// 별똥별 소원
let activeWishes = [];
let wishShownIds = new Set();

// 이스터에그
const supernovaEffects = [];
let bigBangActive = false;
let bigBangParticles = [];
let bigBangPhase = 0;
let bigBangTimer = 0;
let originalPlanetPositions = [];

// ── 태양계 궤도 링 + 태양 ──────────────────────────────────────────
const ORBIT_RINGS = [
    { name: '수성',   orbit: 140,  color: '#A0A0A0', dotColor: '#B0B0B0', dotSize: 4,  angle: 0.8 },
    { name: '금성',   orbit: 200,  color: '#C8A45A', dotColor: '#DEB87A', dotSize: 7,  angle: 2.1 },
    { name: '화성',   orbit: 265,  color: '#C1440E', dotColor: '#E05020', dotSize: 5,  angle: 3.8 },
    { name: '목성',   orbit: 345,  color: '#C88B3A', dotColor: '#D89B4A', dotSize: 14, angle: 1.2 },
    { name: '토성',   orbit: 430,  color: '#EAD6B8', dotColor: '#EAD6B8', dotSize: 11, angle: 5.5, ring: true },
    { name: '천왕성', orbit: 520,  color: '#7EC8E3', dotColor: '#8ED8F3', dotSize: 9,  angle: 4.1 },
    { name: '해왕성', orbit: 615,  color: '#4169E1', dotColor: '#5179F1', dotSize: 8,  angle: 2.7 },
];

function drawSolarBackground(cx, cy) {
    // 태양 (우측 상단 글로우)
    const sx = cx + Math.min(canvas.width * 0.38, 320);
    const sy = cy - Math.min(canvas.height * 0.36, 240);

    const sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 110);
    sunGlow.addColorStop(0, 'rgba(255,210,80,0.18)');
    sunGlow.addColorStop(0.6, 'rgba(255,140,30,0.07)');
    sunGlow.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sx, sy, 110, 0, Math.PI * 2);
    ctx.fill();

    const sunCore = ctx.createRadialGradient(sx - 7, sy - 7, 0, sx, sy, 20);
    sunCore.addColorStop(0, 'rgba(255,245,150,0.55)');
    sunCore.addColorStop(1, 'rgba(255,160,30,0.28)');
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.fillStyle = sunCore;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,210,100,0.35)';
    ctx.font = '9px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('태양', sx, sy + 24);

    // 7개 궤도 링 + 라벨 + 행성 아이콘
    ORBIT_RINGS.forEach(r => {
        const orbit = r.orbit * systemScale;

        // 궤도 선
        ctx.beginPath();
        ctx.arc(cx, cy, orbit, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,0.06)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 9]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 궤도 이름 라벨 (오른쪽 45도 방향)
        const lx = cx + orbit * 0.72;
        const ly = cy - orbit * 0.72;
        ctx.fillStyle = 'rgba(180,190,220,0.35)';
        ctx.font = '9px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.name, lx + 4, ly);

        // 행성 아이콘 (고정 각도 위치)
        const px = cx + orbit * Math.cos(r.angle);
        const py = cy + orbit * Math.sin(r.angle);

        ctx.save();
        ctx.globalAlpha = 0.35;

        if (r.ring) {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(0.4);
            ctx.beginPath();
            ctx.ellipse(0, 0, r.dotSize * 2.0, r.dotSize * 0.4, 0, 0, Math.PI * 2);
            ctx.strokeStyle = r.dotColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        const dg = ctx.createRadialGradient(px - r.dotSize*0.3, py - r.dotSize*0.3, 0, px, py, r.dotSize);
        dg.addColorStop(0, lightenColor(r.dotColor, 30));
        dg.addColorStop(1, r.dotColor);
        ctx.beginPath();
        ctx.arc(px, py, r.dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dg;
        ctx.fill();

        ctx.restore();
    });
}

// ── 별똥별 ────────────────────────────────────────────────────────
let shootingStars = [];

function spawnShootingStar() {
    const side = Math.random() < 0.5 ? 'top' : 'left';
    const star = {
        x: side === 'top' ? Math.random() * canvas.width : 0,
        y: side === 'top' ? 0 : Math.random() * canvas.height * 0.5,
        len: Math.random() * 120 + 60,
        speed: Math.random() * 4 + 3,
        alpha: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        width: Math.random() * 1.5 + 0.5
    };
    shootingStars.push(star);
}

// 3~8초마다 별똥별 생성
function scheduleShootingStar() {
    const delay = 3000 + Math.random() * 5000;
    setTimeout(() => {
        spawnShootingStar();
        scheduleShootingStar();
    }, delay);
}

function drawShootingStars() {
    shootingStars = shootingStars.filter(s => s.alpha > 0.02);
    shootingStars.forEach(s => {
        const tailX = s.x - Math.cos(s.angle) * s.len;
        const tailY = s.y - Math.sin(s.angle) * s.len;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.7, `rgba(200,180,255,${s.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.stroke();

        // 머리 부분 빛
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.width * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * 0.9})`;
        ctx.fill();

        // 소원 텍스트
        if (s.wish) {
            ctx.save();
            ctx.globalAlpha = s.alpha * 0.9;
            ctx.fillStyle = 'rgba(255,230,150,1)';
            ctx.font = `bold 13px 'Noto Sans KR', sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255,200,50,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(s.wish, s.x + 8, s.y - 8);
            ctx.restore();
        }

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.012;
    });
}

// ── 줌 상태 (orbit 반지름에 배율 적용) ────────────────────────────
let systemScale = 1.0;
const SCALE_MIN = 0.25;
const SCALE_MAX = 2.5;

function setScale(v) {
    systemScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, v));
    updateZoomButtons();
}

function updateZoomButtons() {
    const btnIn  = document.getElementById('zoomIn');
    const btnOut = document.getElementById('zoomOut');
    if (btnIn)  btnIn.disabled  = systemScale >= SCALE_MAX;
    if (btnOut) btnOut.disabled = systemScale <= SCALE_MIN;
}

// ── 이미지 캐시 ────────────────────────────────────────────────────
function loadImage(url) {
    if (imageCache[url]) return Promise.resolve(imageCache[url]);
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => { imageCache[url] = img; resolve(img); };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// ── 캔버스 초기화 ──────────────────────────────────────────────────
function resizeCanvas() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    initPlanets();
}

function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            alpha: Math.random(),
            speed: Math.random() * 0.005 + 0.002
        });
    }
}

function initPlanets() {
    if (!compatibilities || !compatibilities.length) return;
    initStars();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    planets = compatibilities.map((c, i) => {
        const angle = (2 * Math.PI / compatibilities.length) * i - Math.PI / 2;
        const p = {
            id: c.id,
            partnerId: c.partnerId,
            name: c.partnerName,
            rank: c.rank,
            score: c.score,
            scoreLabel: c.scoreLabel,
            color: c.planetColor,
            size: parseInt(c.planetSize) / 2,
            baseOrbit: c.orbitRadius,
            angle,
            speed: 0.0003 + ((i * 0.00007) % 0.0002),
            x: cx + c.orbitRadius * Math.cos(angle),
            y: cy + c.orbitRadius * Math.sin(angle),
            hovered: false,
            gender: c.gender || '',
            emoji: c.partnerEmoji || null,
            status: c.partnerStatus || null,
            img: null
        };
        if (c.profileImage) {
            loadImage('/uploads/' + c.profileImage).then(img => { p.img = img; });
        }
        return p;
    });
}

// ── 렌더 루프 ──────────────────────────────────────────────────────
function render() {
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 배경
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));
    bg.addColorStop(0, '#0D0B2B');
    bg.addColorStop(1, '#050510');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 별똥별
    drawShootingStars();

    // 별
    stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.abs(s.alpha) * 0.8})`;
        ctx.fill();
    });

    // 태양계 궤도 + 태양
    drawSolarBackground(cx, cy);

    if (!planets.length) { animFrame = requestAnimationFrame(render); return; }

    // 궤도 (systemScale 반영)
    planets.forEach(p => {
        const r = p.baseOrbit * systemScale;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // 중심 글로우
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    glow.addColorStop(0, 'rgba(96,165,250,0.15)');
    glow.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 80, cy - 80, 160, 160);

    // 행성
    planets.forEach(p => {
        const orbit = p.baseOrbit * systemScale;
        if (!bigBangActive) {
            p.angle += p.speed;
            p.x = cx + orbit * Math.cos(p.angle);
            p.y = cy + orbit * Math.sin(p.angle);
        }

        const radius = (p.hovered ? p.size * 1.3 : p.size) * Math.max(0.5, systemScale);

        // 글로우
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
        pg.addColorStop(0, p.color + '55');
        pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 행성 본체
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        if (p.img) {
            ctx.save();
            ctx.clip();
            ctx.drawImage(p.img, p.x - radius, p.y - radius, radius * 2, radius * 2);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = p.hovered ? 'white' : p.color;
            ctx.lineWidth = p.hovered ? 3 : 2;
            ctx.stroke();
        } else {
            const grad = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, 0, p.x, p.y, radius);
            grad.addColorStop(0, lightenColor(p.color, 40));
            grad.addColorStop(1, p.color);
            ctx.fillStyle = grad;
            ctx.fill();

            // 이모지 (커스텀 있으면 이모지, 없으면 성별 기호)
            if (p.emoji) {
                ctx.font = `${Math.max(12, radius * 0.9)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.emoji, p.x, p.y);
            } else {
                const symbol = p.gender === 'MALE' ? '♂' : '♀';
                ctx.fillStyle = p.gender === 'MALE' ? '#0369A1' : '#BE185D';
                ctx.font = `bold ${Math.max(10, radius * 0.75)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, p.x, p.y);
            }
        }

        // hover 오버레이
        if (p.hovered) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.max(10, radius * 0.65)}px 'Noto Sans KR', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.score + '점', p.x, p.y);
        }

        // 온라인 표시 (인스타그램 스타일 녹색 링)
        if (onlinePartnerIds.has(Number(p.partnerId))) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 3;
            ctx.stroke();
            // 글로우
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(34,197,94,0.3)';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // 이름 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${Math.max(9, 11 * systemScale)}px 'Noto Sans KR', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(p.name, p.x, p.y + radius + 4);
        // 상태메시지
        if (p.status && systemScale > 0.4) {
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = `${Math.max(8, 9 * systemScale)}px 'Noto Sans KR', sans-serif`;
            ctx.fillText(p.status, p.x, p.y + radius + 4 + Math.max(9, 11 * systemScale) + 2);
        }
    });

    // 말풍선 그리기
    drawSpeechBubbles();

    // 이모지 파티클
    drawEmojiParticles();

    // 빅뱅
    if (bigBangActive) updateBigBang(cx, cy);

    // 수퍼노바
    drawSupernovaEffects();

    animFrame = requestAnimationFrame(render);
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
}

// ── 이모지 파티클 ──────────────────────────────────────────────────
function triggerEmojiParticle(partnerId, emoji, incoming = false) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
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
        progress: 0,
        emoji: emoji
    });
}

function drawEmojiParticles() {
    for (let i = emojiParticles.length - 1; i >= 0; i--) {
        const p = emojiParticles[i];
        p.progress += 0.018;
        if (p.progress >= 1) { emojiParticles.splice(i, 1); continue; }
        const t = p.progress;
        const x = (1-t)*(1-t)*p.startX + 2*(1-t)*t*p.cpX + t*t*p.endX;
        const y = (1-t)*(1-t)*p.startY + 2*(1-t)*t*p.cpY + t*t*p.endY;
        const alpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
        const scale = 1 + Math.sin(t * Math.PI) * 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `${26 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, x, y);
        ctx.restore();
    }
}

function extractEmoji(msg) {
    const match = msg.match(/\p{Emoji_Presentation}|\p{Emoji}️/gu);
    return match ? match[0] : '✉️';
}

// ── 마우스 이벤트 ──────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let any = false;
    planets.forEach(p => {
        const r = (p.size) * Math.max(0.5, systemScale);
        p.hovered = Math.hypot(mx - p.x, my - p.y) < r * 1.8;
        if (p.hovered) any = true;
    });
    canvas.style.cursor = any ? 'pointer' : 'default';
});

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    planets.forEach(p => {
        const r = p.size * Math.max(0.5, systemScale);
        if (Math.hypot(mx - p.x, my - p.y) < r * 1.8) showDetail(p.id);
    });
});

// ── 마우스 휠 줌 ──────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    setScale(systemScale * (e.deltaY < 0 ? 1.12 : 0.9));
}, { passive: false });

// ── 터치 줌 (핀치) ────────────────────────────────────────────────
let lastPinchDist = 0;
let touchStarted = false;

canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        touchStarted = true;
    }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && touchStarted) {
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDist > 0) setScale(systemScale * (dist / lastPinchDist));
        lastPinchDist = dist;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { touchStarted = false; lastPinchDist = 0; });

// 터치 탭으로 행성 클릭
canvas.addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && !touchStarted) {
        const rect = canvas.getBoundingClientRect();
        const tx = e.changedTouches[0].clientX - rect.left;
        const ty = e.changedTouches[0].clientY - rect.top;
        planets.forEach(p => {
            const r = p.size * Math.max(0.5, systemScale);
            if (Math.hypot(tx - p.x, ty - p.y) < r * 2) showDetail(p.id);
        });
    }
});

// ── 줌 버튼 ───────────────────────────────────────────────────────
document.getElementById('zoomIn') ?.addEventListener('click',  () => setScale(systemScale * 1.2));
document.getElementById('zoomOut')?.addEventListener('click',  () => setScale(systemScale * 0.8));
document.getElementById('zoomReset')?.addEventListener('click',() => setScale(1.0));

// ── 목록 토글 ─────────────────────────────────────────────────────
const scoreList    = document.getElementById('scoreList');
const drawerToggle = document.getElementById('drawerToggle');
const desktopToggle = document.getElementById('scoreListToggle');

// 모바일 드로어
if (drawerToggle && scoreList) {
    drawerToggle.addEventListener('click', () => {
        scoreList.classList.toggle('expanded');
        drawerToggle.textContent = scoreList.classList.contains('expanded') ? '▼ 접기' : '▲ 목록';
    });
}

// 데스크탑 드롭다운
function toggleScoreList() {
    if (!scoreList) return;
    scoreList.classList.toggle('collapsed');
    if (desktopToggle) {
        desktopToggle.textContent = scoreList.classList.contains('collapsed') ? '∨' : '∧';
    }
}

// ── 상세 모달 ──────────────────────────────────────────────────────
function showDetail(id) {
    fetch(`/compatibility/${id}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('modalName').textContent = data.partnerName;
            document.getElementById('modalLabel').textContent = data.scoreLabel;
            document.getElementById('modalScore').textContent = data.score;
            document.getElementById('modalGender').textContent = data.partnerGender === 'MALE' ? '남성' : '여성';
            document.getElementById('modalZodiac').textContent = data.partnerZodiac + '띠';
            document.getElementById('modalDate').textContent = data.createdAt;
            document.getElementById('modalAnalysis').textContent = data.analysisText || '분석 중...';

            const planet = planets.find(p => p.id === id);
            const color = planet ? planet.color : '#A855F7';
            const mp = document.getElementById('modalPlanet');
            mp.style.background = `radial-gradient(circle at 35% 35%, ${lightenColor(color, 40)}, ${color})`;
            mp.style.boxShadow = `0 0 20px ${color}66`;
            mp.style.overflow = 'hidden';

            if (data.partnerProfileImage) {
                mp.innerHTML = `<img src="/uploads/${data.partnerProfileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            } else {
                const rankText = data.rank + '위';
                mp.innerHTML = `<span style="font-size:13px;font-weight:800;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.5)">${rankText}</span>`;
            }

            document.getElementById('zodiacBar').style.width = (data.zodiacScore || 0) + '%';
            document.getElementById('numerologyBar').style.width = (data.numerologyScore || 0) + '%';
            document.getElementById('elementBar').style.width = (data.elementScore || 0) + '%';
            document.getElementById('zodiacScore').textContent = data.zodiacScore || 0;
            document.getElementById('numerologyScore').textContent = data.numerologyScore || 0;
            document.getElementById('elementScore').textContent = data.elementScore || 0;

            // 채팅 보너스 바
            const bonusPct = Math.min(100, (data.chatBonus || 0) * 3);
            const bonusBar = document.getElementById('chatBonusBar');
            const bonusScore = document.getElementById('chatBonusScore');
            if (bonusBar) bonusBar.style.width = bonusPct + '%';
            if (bonusScore) bonusScore.textContent = '+' + (data.chatBonus || 0);

            // D+N 연결 일수
            const daysEl = document.getElementById('modalDays');
            if (daysEl && data.createdAt) {
                const connected = new Date(data.createdAt);
                const diff = Math.floor((Date.now() - connected.getTime()) / 86400000);
                daysEl.textContent = 'D+' + diff;
            }

            const modal = document.getElementById('detailModal');
            modal.classList.add('active');
            modal._currentData = data;

            // 주별 채팅 통계 차트
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

window.addEventListener('resize', () => { cancelAnimationFrame(animFrame); resizeCanvas(); render(); });

resizeCanvas();
// 모바일: 채팅 버튼 텍스트 초기화
if (isMobile()) {
    const btn = document.getElementById('chatToggleBtn');
    if (btn) btn.textContent = '💬';
}
// 모바일: 목성 궤도(345)가 화면에 들어오도록 초기 스케일 자동 조정
if (canvas.width < 768) {
    const autoScale = (canvas.width / 2 * 0.85) / 345;
    systemScale = Math.max(SCALE_MIN, Math.min(0.75, autoScale));
}
render();
updateZoomButtons();
scheduleShootingStar();

const params = new URLSearchParams(window.location.search);
const newId = params.get('new');
if (newId) setTimeout(() => showDetail(parseInt(newId)), 800);

// ── 채팅 ────────────────────────────────────────────────────────────

const isMobile = () => window.innerWidth <= 768;

function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chatPanel');
    const body  = document.getElementById('chatBody');
    const btn   = document.getElementById('chatToggleBtn');

    if (isMobile()) {
        if (chatOpen) {
            panel.classList.add('chat-expanded');
            btn.textContent = '✕';
            unreadCount = 0; updateBadge();
        } else {
            panel.classList.remove('chat-expanded');
            btn.textContent = '💬';
            backToPartners();
        }
    } else {
        body.style.display = chatOpen ? 'flex' : 'none';
        btn.textContent = chatOpen ? '∨' : '∧';
        if (chatOpen) { unreadCount = 0; updateBadge(); }
    }
}

function openChat(partnerId, partnerName) {
    currentPartnerId = partnerId;
    currentPartnerName = partnerName;
    document.getElementById('chatPartners').style.display = 'none';
    document.getElementById('chatRoom').style.display    = 'flex';
    document.getElementById('chatRoomTitle').textContent = partnerName;
    document.getElementById('chatTitle').textContent     = partnerName;
    document.getElementById('chatMessages').innerHTML    = '';
    fetch(`/api/chat/read/${partnerId}`, { method: 'POST' });
    loadMessages();
    startPolling();
}

function backToPartners() {
    currentPartnerId = null;
    document.getElementById('chatPartners').style.display = 'block';
    document.getElementById('chatRoom').style.display    = 'none';
    document.getElementById('chatTitle').textContent     = '채팅';
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
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    // 이스터에그
    if (msg === '/bigbang') {
        triggerBigBang();
        if (currentPartnerId) sendEffect('BIGBANG', currentPartnerId);
        return;
    }
    if (msg === '/supernova') {
        triggerSupernova();
        if (currentPartnerId) sendEffect('SUPERNOVA', currentPartnerId);
        return;
    }

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
    const box = document.getElementById('chatMessages');
    const last = box.lastElementChild;
    const consecutive = last && last.dataset.senderId == m.senderId && last.dataset.timeMin === m.createdAt;

    // 연속 메시지면 이전 메시지의 시간 숨기기
    if (consecutive) {
        const prevTime = last.querySelector('.chat-time');
        if (prevTime) prevTime.style.display = 'none';
    }

    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.mine ? 'chat-msg-mine' : 'chat-msg-other')
        + (consecutive ? ' chat-msg-consecutive' : '')
        + (animate ? ' chat-msg-new' : '');
    div.dataset.senderId = m.senderId;
    div.dataset.timeMin = m.createdAt;
    div.dataset.msgId = m.id;
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
                    // 상대가 메시지를 보냈다 = 내 이전 메시지들을 읽었음
                    markSentMessagesAsRead();
                } else {
                    unreadCount++;
                    updateBadge();
                }
            });
        });
}

function markSentMessagesAsRead() {
    document.querySelectorAll('#chatMessages .chat-msg-mine .chat-read-mark').forEach(el => {
        el.classList.add('read');
    });
}

function updateBadge() {
    const badge = document.getElementById('chatBadge');
    if (unreadCount > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = unreadCount;
    } else {
        badge.style.display = 'none';
    }
}

// ── 말풍선 (canvas) ─────────────────────────────────────────────────
function triggerSpeechBubble(senderId, message) {
    const id = Number(senderId);
    const planet = planets.find(p => Number(p.partnerId) === id || Number(p.id) === id);
    if (!planet) return;
    speechBubbles.push({
        planetRef: planet,
        message: message.length > 20 ? message.slice(0, 20) + '…' : message,
        alpha: 1.0,
        createdAt: Date.now()
    });
}

function drawSpeechBubbles() {
    const now = Date.now();
    for (let i = speechBubbles.length - 1; i >= 0; i--) {
        const b = speechBubbles[i];
        const age = now - b.createdAt;
        if (age > 4000) { speechBubbles.splice(i, 1); continue; }
        b.alpha = age < 3000 ? 1 : 1 - (age - 3000) / 1000;

        const bx = b.planetRef.x + 20;
        const by = b.planetRef.y - 55;
        const pad = 10;
        ctx.font = `13px 'Noto Sans KR', sans-serif`;
        const tw = ctx.measureText(b.message).width;
        const bw = tw + pad * 2;
        const bh = 30;

        ctx.save();
        ctx.globalAlpha = b.alpha;

        // 말풍선 배경
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        const r = 8;
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();

        // 꼬리
        ctx.beginPath();
        ctx.moveTo(bx + 10, by + bh);
        ctx.lineTo(bx + 2, by + bh + 8);
        ctx.lineTo(bx + 18, by + bh);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();

        // 텍스트
        ctx.fillStyle = '#1e1e3f';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.message, bx + pad, by + bh / 2);

        ctx.restore();
    }
}

// ── 별똥별 소원 ────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    shootingStars.forEach(s => {
        if (Math.hypot(mx - s.x, my - s.y) < 20 && s.alpha > 0.3) {
            showWishInput();
        }
    });
}, true);

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
    document.getElementById('wishText').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') submitWish();
    });
}

function submitWish() {
    const text = document.getElementById('wishText')?.value?.trim();
    if (!text) return;
    document.getElementById('wishInputBox')?.remove();
    fetch('/api/wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    }).then(() => {
        // 즉시 내 화면에도 별똥별 생성
        spawnWishStar(text);
        showToast('🌠 소원이 하늘로 날아갔어요!');
    });
}

function spawnWishStar(text) {
    const star = {
        x: 0,
        y: Math.random() * canvas.height * 0.4,
        len: Math.random() * 120 + 80,
        speed: Math.random() * 6 + 5,
        alpha: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        width: 2,
        wish: text
    };
    shootingStars.push(star);
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
        });
}
pollWishes();
setInterval(pollWishes, 5000);

window.submitWish = submitWish;
window.showWishInput = showWishInput;

// 온라인 상태 폴링 (30초마다)
function pollOnlineStatus() {
    fetch('/api/chat/online')
        .then(r => r.json())
        .then(ids => {
            onlinePartnerIds = new Set(ids.map(Number));
            console.log('온라인 파트너:', ids);
        });
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
                if (e.type === 'BIGBANG') triggerBigBang();
                if (e.type === 'SUPERNOVA') triggerSupernovaOnPlanet(e.senderId);
            });
        });
}
setInterval(pollEffects, 3000);

function triggerSupernovaOnPlanet(senderId) {
    const planet = planets.find(p => Number(p.partnerId) === Number(senderId));
    const x = planet ? planet.x : canvas.width / 2;
    const y = planet ? planet.y : canvas.height / 2;
    supernovaEffects.push({ x, y, frame: 0, maxFrame: 80, scale: 10 });
}

// ── 이스터에그 ──────────────────────────────────────────────────────

function triggerBigBang() {
    if (bigBangActive) return;
    bigBangActive = true;
    bigBangPhase = 0;
    bigBangTimer = 0;
    bigBangParticles = [];
    showToast('💥 BIGBANG!!!');

    // 원래 행성 위치 저장
    originalPlanetPositions = planets.map(p => ({
        angle: p.angle, baseOrbit: p.baseOrbit
    }));

    // 파티클 생성
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 18 + 6;
        const colors = ['#FF6B6B','#FFE66D','#4ECDC4','#A78BFA','#F9A8C9','#7DD3FC','#FFA500','#FF69B4'];
        bigBangParticles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    // 행성 폭발적으로 날리기
    planets.forEach(p => {
        const angle = Math.atan2(p.y - cy, p.x - cx);
        p._bbVx = Math.cos(angle) * 25;
        p._bbVy = Math.sin(angle) * 25;
        p._bbPhase = 'explode';
    });

    runBigBang();
}

function updateBigBang(cx, cy) {
    bigBangTimer++;

    // 페이즈 1 (0~60): 폭발
    if (bigBangTimer < 60) {
        planets.forEach(p => {
            p.x += p._bbVx || 0;
            p.y += p._bbVy || 0;
            if (p._bbVx) p._bbVx *= 0.95;
            if (p._bbVy) p._bbVy *= 0.95;
        });
    }

    // 페이즈 2 (60~160): 원래 위치로 복귀
    if (bigBangTimer >= 60) {
        planets.forEach((p, i) => {
            const orig = originalPlanetPositions[i];
            if (!orig) return;
            const targetX = cx + orig.baseOrbit * systemScale * Math.cos(orig.angle);
            const targetY = cy + orig.baseOrbit * systemScale * Math.sin(orig.angle);
            p.x += (targetX - p.x) * 0.07;
            p.y += (targetY - p.y) * 0.07;
        });
    }

    // 파티클 그리기
    bigBangParticles.forEach(pt => {
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx *= 0.96; pt.vy *= 0.96;
        pt.alpha -= 0.014;
        if (pt.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 중심 플래시
    if (bigBangTimer < 15) {
        ctx.save();
        ctx.globalAlpha = (15 - bigBangTimer) / 15 * 0.85;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // 종료
    if (bigBangTimer >= 180) {
        bigBangActive = false;
        bigBangParticles = [];
        planets.forEach(p => { delete p._bbVx; delete p._bbVy; });
    }
}

function triggerSupernova() {
    showToast('🌟 SUPERNOVA!');
    supernovaEffects.push({ x: canvas.width / 2, y: canvas.height / 2, frame: 0, maxFrame: 80, scale: 12 });
}

function drawSupernovaEffects() {
    for (let i = supernovaEffects.length - 1; i >= 0; i--) {
        const s = supernovaEffects[i];
        s.frame++;
        if (s.frame > s.maxFrame) { supernovaEffects.splice(i, 1); continue; }
        const radius = s.frame * s.scale;
        const alpha = Math.max(0, 1 - s.frame / s.maxFrame);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
        grad.addColorStop(0, 'rgba(255,255,200,0.9)');
        grad.addColorStop(0.3, 'rgba(255,150,50,0.6)');
        grad.addColorStop(1, 'rgba(255,50,50,0)');
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }
}

function drawWeeklyChart(counts) {
    const cvs = document.getElementById('weeklyChartCanvas');
    if (!cvs) return;
    const c = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;
    c.clearRect(0, 0, W, H);
    const max = Math.max(...counts, 1);
    const barW = W / counts.length * 0.55;
    const gap  = W / counts.length;
    const labels = ['3주전','2주전','1주전','이번주'];
    counts.forEach((v, i) => {
        const bh = (v / max) * (H - 28);
        const x  = i * gap + gap * 0.225;
        const y  = H - 20 - bh;
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
window.toggleChat    = toggleChat;
window.openChat      = openChat;
window.backToPartners = backToPartners;
window.sendChatMessage = sendChatMessage;

// 모바일 키보드가 올라올 때 채팅 패널이 키보드 뒤에 숨지 않도록 위로 올림
if (window.visualViewport) {
    function onViewportResize() {
        const panel = document.getElementById('chatPanel');
        if (!panel) return;
        const keyboardHeight = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
        panel.style.bottom = Math.max(0, keyboardHeight) + 'px';
    }
    window.visualViewport.addEventListener('resize', onViewportResize);
    window.visualViewport.addEventListener('scroll', onViewportResize);
}

// 백그라운드에서도 새 메시지 polling
setInterval(() => {
    if (!currentPartnerId) {
        fetch(`/api/chat/new?since=${encodeURIComponent(lastMessageTime)}`)
            .then(r => r.json())
            .then(msgs => {
                if (!msgs.length) return;
                lastMessageTime = msgs[msgs.length - 1].createdAtIso || nowKST();
                msgs.forEach(m => { triggerSpeechBubble(m.senderId, m.message); unreadCount++; updateBadge(); });
            });
    }
}, 5000);
