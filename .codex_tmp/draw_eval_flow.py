from PIL import Image, ImageDraw, ImageFont
import math
from pathlib import Path


OUT = Path("backend/common/eval/evaluation_flow_corrected.png")

W, H = 1950, 1220
SCALE = 2
img = Image.new("RGB", (W * SCALE, H * SCALE), "white")
draw = ImageDraw.Draw(img)


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\malgunbd.ttf" if bold else r"C:\Windows\Fonts\malgun.ttf",
        r"C:\Windows\Fonts\malgunsl.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size * SCALE)
    return ImageFont.load_default()


F_TITLE = font(30, True)
F_BOX = font(21)
F_BOX_B = font(22, True)
F_SMALL = font(17)


def sc(v):
    return int(v * SCALE)


def rect(x, y, w, h, text, fill="#FFFFFF", outline="#D8DEE9", width=2, bold=False, radius=14):
    x1, y1, x2, y2 = map(sc, (x, y, x + w, y + h))
    draw.rounded_rectangle([x1, y1, x2, y2], radius=sc(radius), fill=fill, outline=outline, width=sc(width))
    lines = text.split("\n")
    f = F_BOX_B if bold else F_BOX
    line_h = int(f.size * 1.28)
    total_h = line_h * len(lines)
    cy = y1 + (y2 - y1 - total_h) // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=f)
        tw = bbox[2] - bbox[0]
        draw.text((x1 + (x2 - x1 - tw) // 2, cy), line, fill="#1F2937", font=f)
        cy += line_h
    return (x, y, w, h)


def center(b):
    x, y, w, h = b
    return (x + w / 2, y + h / 2)


def top(b):
    x, y, w, h = b
    return (x + w / 2, y)


def bottom(b):
    x, y, w, h = b
    return (x + w / 2, y + h)


def left(b):
    x, y, w, h = b
    return (x, y + h / 2)


def right(b):
    x, y, w, h = b
    return (x + w, y + h / 2)


def arrow(p1, p2, color="#6B7280", width=2, elbow=None):
    pts = [p1]
    if elbow:
        pts.extend(elbow)
    pts.append(p2)
    pts_s = [(sc(x), sc(y)) for x, y in pts]
    draw.line(pts_s, fill=color, width=sc(width), joint="curve")
    x1, y1 = pts_s[-2]
    x2, y2 = pts_s[-1]
    ang = math.atan2(y2 - y1, x2 - x1)
    size = sc(12)
    a1 = ang + math.pi * 0.82
    a2 = ang - math.pi * 0.82
    head = [(x2, y2), (x2 + size * math.cos(a1), y2 + size * math.sin(a1)), (x2 + size * math.cos(a2), y2 + size * math.sin(a2))]
    draw.polygon(head, fill=color)


def label(x, y, text, size_font=F_SMALL, color="#4B5563"):
    lines = text.split("\n")
    yy = sc(y)
    for line in lines:
        draw.text((sc(x), yy), line, fill=color, font=size_font)
        yy += int(size_font.size * 1.25)


title = "리포트 파이프라인 평가 Flow — Ver2 T/F는 내부 단계, 평가는 내용 비교 중심"
b_title = draw.textbbox((0, 0), title, font=F_TITLE)
draw.text((sc((W - (b_title[2] - b_title[0]) / SCALE) / 2), sc(28)), title, fill="#111827", font=F_TITLE)

top_a = rect(735, 90, 330, 64, "골드셋 20건 로드", fill="#F8FAFC", bold=True)
inp = rect(690, 185, 420, 92, "원본 입력\nresume · company_info · job_description", fill="#F8FAFC")

v1 = rect(180, 335, 280, 70, "Ver1: 모듈 격리 평가", fill="#EEF6FF", bold=True, outline="#A7C7E7")
v1g = rect(205, 455, 230, 64, "골드 요약 고정", fill="#F8FAFC")
v1tf = rect(55, 610, 300, 86, "① 골드 체크리스트 문항으로\nT/F 재판정", fill="#FFFFFF")
v1tf_eval = rect(42, 775, 330, 96, "골드 result와 직접 비교\nAccuracy · Precision · Recall · F1", fill="#FFF7ED", outline="#FDBA74")
v1q = rect(405, 610, 330, 86, "② 골드 체크리스트 문항+정답으로\n질문·모범답안 생성", fill="#FFFFFF")
v1r = rect(785, 610, 330, 86, "③ 골드 체크리스트 문항+정답으로\n리포트 생성", fill="#FFFFFF")
v1judge = rect(520, 795, 360, 82, "GPT-4o-mini LLM Judge\n골드 질문·리포트와 비교", fill="#F5F3FF", outline="#C4B5FD")

v2 = rect(1230, 335, 310, 70, "Ver2: 전체 파이프라인 평가", fill="#ECFDF5", bold=True, outline="#86EFAC")
v2s = rect(1180, 470, 400, 74, "0. 이력서·회사·JD 요약 생성", fill="#FFFFFF")
v2s_eval = rect(930, 575, 340, 82, "요약 평가\n골드 요약과 의미 비교", fill="#FFF7ED", outline="#FDBA74")
v2cl = rect(1320, 590, 350, 76, "① 체크리스트 문항 생성", fill="#FFFFFF")
v2cl_eval = rect(960, 720, 385, 104, "체크리스트 문항 내용 평가\n골드 체크리스트와 의미 비교\nmatched · coverage · noise", fill="#FFF7ED", outline="#FDBA74")
v2tf = rect(1360, 760, 350, 82, "이력서 적합성 T/F 판정\n(파이프라인 내부 단계)", fill="#F3F4F6", outline="#9CA3AF")
v2q = rect(1220, 925, 305, 78, "② 질문·모범답안 생성", fill="#FFFFFF")
v2q_eval = rect(1085, 1065, 350, 86, "GPT-4o-mini LLM Judge\n골드 질문·답안과 비교", fill="#F5F3FF", outline="#C4B5FD")
v2r = rect(1560, 925, 300, 78, "③ 최종 리포트·등급 생성", fill="#FFFFFF")
v2r_eval = rect(1480, 1065, 370, 98, "GPT-4o-mini LLM Judge\n골드 리포트와 비교\n등급·result 일치율 간접 반영", fill="#F5F3FF", outline="#C4B5FD")

result = rect(725, 1125, 350, 64, "Ver1 ↔ Ver2 결과 비교", fill="#F8FAFC", bold=True)

arrow(bottom(top_a), top(inp))
arrow(left(inp), top(v1), elbow=[(250, 230)])
arrow(right(inp), top(v2), elbow=[(1385, 230)])

arrow(bottom(v1), top(v1g))
arrow(bottom(v1g), top(v1tf), elbow=[(320, 555), (205, 555)])
arrow(bottom(v1g), top(v1q), elbow=[(320, 560), (570, 560)])
arrow(bottom(v1g), top(v1r), elbow=[(320, 560), (950, 560)])
arrow(bottom(v1tf), top(v1tf_eval))
arrow(bottom(v1q), left(v1judge), elbow=[(570, 745)])
arrow(bottom(v1r), right(v1judge), elbow=[(950, 745)])

arrow(bottom(v2), top(v2s))
arrow(bottom(v2s), top(v2s_eval), elbow=[(1380, 555), (1100, 555)])
arrow(bottom(v2s), top(v2cl), elbow=[(1380, 555)])
arrow(bottom(v2cl), top(v2cl_eval), elbow=[(1495, 700), (1152, 700)])
arrow(bottom(v2cl), top(v2tf))
arrow(bottom(v2tf), top(v2q), elbow=[(1535, 880), (1372, 880)])
arrow(bottom(v2tf), top(v2r), elbow=[(1535, 880), (1710, 880)])
arrow(bottom(v2q), top(v2q_eval))
arrow(bottom(v2r), top(v2r_eval))

arrow(bottom(v1tf_eval), left(result), elbow=[(205, 1110)])
arrow(bottom(v1judge), left(result), elbow=[(700, 1040)])
arrow(bottom(v2s_eval), top(result), elbow=[(1100, 1040), (900, 1040)])
arrow(bottom(v2cl_eval), top(result), elbow=[(1152, 1038), (930, 1038)])
arrow(bottom(v2q_eval), top(result), elbow=[(1260, 1110), (900, 1110)])
arrow(bottom(v2r_eval), right(result), elbow=[(1665, 1200), (1100, 1200)])

label(1360, 845, "※ Ver2 T/F는 독립 분류 지표가 아니라\n   최종 리포트 평가에 간접 반영", F_SMALL, "#6B7280")

img = img.resize((W, H), Image.Resampling.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT)
print(str(OUT.resolve()))
