from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "monthly-electricity-bills-2026-v2"
FONT = ROOT / "web" / "app" / "fonts" / "PretendardPDF.ttf"

USAGES = [982, 1014, 1086, 1142, 1231, 1368, 1426, 1397, 1254, 1117, 1038, 1006]
AMOUNTS = [140683, 145267, 155583, 163605, 176356, 195983, 204292, 200137, 179650, 160023, 148706, 144122]
METERS = [24982, 25996, 27082, 28224, 29455, 30823, 32249, 33646, 34900, 36017, 37055, 38061]

NAVY = HexColor("#0B2C4C")
BLUE = HexColor("#0066C7")
SKY = HexColor("#EAF4FF")
LINE = HexColor("#D8E3EE")
MUTED = HexColor("#5F7386")
INK = HexColor("#152534")
GREEN = HexColor("#11A36A")


def text(c, value, x, y, size, color=INK, font="Pretendard", align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "right":
        c.drawRightString(x, y, value)
    elif align == "center":
        c.drawCentredString(x, y, value)
    else:
        c.drawString(x, y, value)


def rule(c, x1, y, x2, color=LINE, width=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def amount_parts(total):
    energy = round(total * 0.72)
    climate = round(total * 0.06)
    fuel = round(total * 0.04)
    vat = round(total * 0.1)
    fund = total - energy - climate - fuel - vat
    return [("전력량요금", energy), ("기후환경요금", climate), ("연료비조정요금", fuel), ("부가가치세", vat), ("전력산업기반기금", fund)]


def month_range(month):
    previous_month = 12 if month == 1 else month - 1
    previous_year = 2025 if month == 1 else 2026
    return f"{previous_year}.{previous_month:02d}.01 - 2026.{month:02d}.01"


def draw_bill(month, usage, total, current_meter):
    filename = OUTPUT / f"carbonreply-test-electricity-bill-2026-{month:02d}.pdf"
    c = canvas.Canvas(str(filename), pagesize=A4)
    width, height = A4
    margin = 42

    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setFillColor(NAVY)
    c.rect(0, height - 104, width, 104, fill=1, stroke=0)
    text(c, "KEPCO ON", margin, height - 43, 10, white, "Pretendard")
    text(c, "전기요금 전자청구서", margin, height - 75, 25, white, "Pretendard")
    text(c, "2026년 %d월 청구분" % month, width - margin, height - 44, 11, HexColor("#B9D9FA"), "Pretendard", "right")
    text(c, "사업장 전력 사용 내역", width - margin, height - 67, 10, white, "Pretendard", "right")

    # Account information card
    c.setFillColor(SKY)
    c.roundRect(margin, height - 220, width - margin * 2, 82, 8, fill=1, stroke=0)
    text(c, "고객번호", margin + 16, height - 160, 9, MUTED)
    text(c, f"TEST-2026-{month:02d}-1842", margin + 16, height - 184, 13, NAVY)
    text(c, "계약자 / 사업장", margin + 198, height - 160, 9, MUTED)
    text(c, "한빛상사 주식회사", margin + 198, height - 184, 13, NAVY)
    text(c, "계약종별", margin + 370, height - 160, 9, MUTED)
    text(c, "일반용 전력(을)", margin + 370, height - 184, 13, NAVY)

    # Hero bill card
    hero_y = height - 368
    c.setFillColor(BLUE)
    c.roundRect(margin, hero_y, width - margin * 2, 124, 10, fill=1, stroke=0)
    text(c, "이번 달 납부하실 금액", margin + 20, hero_y + 96, 10, HexColor("#D6EAFE"))
    text(c, f"{total:,}원", margin + 20, hero_y + 50, 31, white)
    text(c, "납부기한  2026.%02d.25" % month, margin + 20, hero_y + 24, 10, HexColor("#D6EAFE"))
    c.setFillColor(white)
    c.roundRect(width - 210, hero_y + 16, 150, 92, 8, fill=1, stroke=0)
    text(c, "당월 전기 사용량", width - 135, hero_y + 84, 9, MUTED, align="center")
    text(c, f"{usage:,}", width - 135, hero_y + 50, 27, NAVY, align="center")
    text(c, "kWh", width - 135, hero_y + 31, 10, BLUE, align="center")

    # Consumption information
    section_y = hero_y - 40
    text(c, "사용량 및 검침 정보", margin, section_y, 15, NAVY)
    text(c, "청구서에 기재된 사용량을 CarbonReply에서 확인해 주세요.", width - margin, section_y + 1, 9, MUTED, align="right")
    rule(c, margin, section_y - 12, width - margin)
    headers = ["사용 기간", "전월 지침", "당월 지침", "당월 사용량"]
    values = [month_range(month), f"{current_meter - usage:,} kWh", f"{current_meter:,} kWh", f"{usage:,} kWh"]
    xs = [margin, margin + 190, margin + 310, margin + 430]
    for x, header, value in zip(xs, headers, values):
        text(c, header, x, section_y - 35, 9, MUTED)
        text(c, value, x, section_y - 58, 11, INK)

    # Recent usage strip
    chart_y = section_y - 135
    text(c, "최근 6개월 사용량", margin, chart_y + 52, 12, NAVY)
    start = max(0, month - 6)
    chart_data = USAGES[start:month]
    max_value = max(chart_data)
    for index, value in enumerate(chart_data):
        x = margin + 170 + index * 58
        bar_height = 18 + (value / max_value) * 38
        c.setFillColor(BLUE if index == len(chart_data) - 1 else HexColor("#A6CBEF"))
        c.roundRect(x, chart_y, 34, bar_height, 3, fill=1, stroke=0)
        text(c, f"{start + index + 1}월", x + 17, chart_y - 15, 8, MUTED, align="center")

    # Fee breakdown
    table_y = chart_y - 35
    text(c, "요금 산정 내역", margin, table_y, 15, NAVY)
    rule(c, margin, table_y - 12, width - margin)
    for index, (label, value) in enumerate(amount_parts(total)):
        column = 0 if index < 3 else 1
        row = index if column == 0 else index - 3
        y = table_y - 36 - row * 23
        label_x = margin + 8 if column == 0 else margin + 286
        value_x = margin + 248 if column == 0 else width - margin - 8
        line_start = margin if column == 0 else margin + 274
        line_end = margin + 258 if column == 0 else width - margin
        text(c, label, label_x, y, 10, MUTED)
        text(c, f"{value:,}원", value_x, y, 10, INK, align="right")
        rule(c, line_start, y - 9, line_end, HexColor("#EDF1F5"), 0.6)
    text(c, "합계", margin + 8, table_y - 112, 11, NAVY)
    text(c, f"{total:,}원", width - margin - 8, table_y - 112, 13, NAVY, align="right")

    # Footer badge and legal clarity
    footer_y = 73
    c.setFillColor(HexColor("#F3F8FC"))
    c.roundRect(margin, footer_y, width - margin * 2, 56, 6, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.circle(margin + 18, footer_y + 37, 4, fill=1, stroke=0)
    text(c, "전자청구서 안내", margin + 30, footer_y + 32, 10, NAVY)
    text(c, "이 문서는 CarbonReply 업로드 테스트용 가상 전기요금 전자청구서입니다.", margin + 30, footer_y + 15, 8.5, MUTED)
    text(c, "KEPCO ON STYLE · CARBONREPLY TEST DATA", margin, 42, 8, MUTED)
    text(c, "실제 한국전력 청구서가 아닙니다.", width - margin, 42, 8, MUTED, align="right")
    c.showPage()
    c.save()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("Pretendard", str(FONT)))
    for month, usage, amount, meter in zip(range(1, 13), USAGES, AMOUNTS, METERS):
        draw_bill(month, usage, amount, meter)
    print(f"Created {len(USAGES)} redesigned test bills in {OUTPUT}")


if __name__ == "__main__":
    main()
