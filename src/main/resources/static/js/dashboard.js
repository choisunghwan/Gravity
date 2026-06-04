const canvas = document.getElementById('universeCanvas');
if (!canvas) throw new Error('canvas not found');

const ctx = canvas.getContext('2d');
let planets = [];
let stars = [];
let animFrame;
const imageCache = {};

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
        speed: Math.random() * 8 + 6,
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
        p.angle += p.speed;
        p.x = cx + orbit * Math.cos(p.angle);
        p.y = cy + orbit * Math.sin(p.angle);

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

            // 성별 기호
            const symbol = p.gender === 'MALE' ? '♂' : '♀';
            ctx.fillStyle = p.gender === 'MALE' ? '#0369A1' : '#BE185D';
            ctx.font = `bold ${Math.max(10, radius * 0.75)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, p.x, p.y);
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

        // 이름 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${Math.max(9, 11 * systemScale)}px 'Noto Sans KR', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(p.name, p.x, p.y + radius + 4);
    });

    animFrame = requestAnimationFrame(render);
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
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

            const modal = document.getElementById('detailModal');
            modal.classList.add('active');
            modal._currentData = data;
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
    const text = `🪐 Gravity 궁합 결과\n${currentUserName} ♡ ${data.partnerName}\n종합 점수: ${data.score}점 (${data.scoreLabel})\n\n${data.analysisText ? data.analysisText.slice(0, 100) + '...' : ''}`;
    if (navigator.share) {
        navigator.share({ title: 'Gravity 궁합 결과', text }).catch(() => copyToClipboard(text));
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
render();
updateZoomButtons();
scheduleShootingStar();

const params = new URLSearchParams(window.location.search);
const newId = params.get('new');
if (newId) setTimeout(() => showDetail(parseInt(newId)), 800);
