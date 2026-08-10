from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Logo paths
MYCLOUD_LOGO = r"C:\Users\sachin\Downloads\mycloud_logo.png"
PROLOGIC_LOGO = r"C:\Users\sachin\Downloads\prologic_logo.png"

# Color scheme - Clean professional with light backgrounds
PRIMARY = RGBColor(0x1A, 0x3C, 0x6E)        # Deep blue
PRIMARY_LIGHT = RGBColor(0x2C, 0x5F, 0x9E)   # Medium blue
ACCENT = RGBColor(0x00, 0x7B, 0xC0)          # Bright blue
ACCENT_LIGHT = RGBColor(0xD1, 0xEC, 0xF9)    # Very light blue
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
OFF_WHITE = RGBColor(0xF8, 0xFA, 0xFC)       # Slight warm white
LIGHT_BG = RGBColor(0xEE, 0xF3, 0xF8)        # Soft blue-gray bg
CARD_BG = RGBColor(0xFF, 0xFF, 0xFF)          # Pure white cards
BLACK = RGBColor(0x2D, 0x2D, 0x2D)
DARK_GRAY = RGBColor(0x4A, 0x4A, 0x4A)
MEDIUM_GRAY = RGBColor(0x7F, 0x8C, 0x8D)
GREEN = RGBColor(0x27, 0xAE, 0x60)
GREEN_DARK = RGBColor(0x1E, 0x8A, 0x4C)
GREEN_LIGHT = RGBColor(0xE8, 0xF8, 0xEF)
GOLD = RGBColor(0xD4, 0xA0, 0x1E)
GOLD_DARK = RGBColor(0xB8, 0x86, 0x0B)
RED_ACCENT = RGBColor(0xC0, 0x39, 0x2B)
PURPLE = RGBColor(0x7D, 0x3C, 0x98)
ORANGE = RGBColor(0xD3, 0x54, 0x00)
TEAL = RGBColor(0x16, 0xA0, 0x85)

# =============================================
# HELPER FUNCTIONS
# =============================================
def add_background(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_rounded_rect(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_text(slide, left, top, width, height, text, size=18, bold=False, color=BLACK, align=PP_ALIGN.LEFT, font="Calibri"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font
    p.alignment = align
    return txBox

def add_circle(slide, left, top, size, color, text="", text_size=11, text_color=WHITE):
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    if text:
        tf = circle.text_frame
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = Pt(text_size)
        p.font.bold = True
        p.font.color.rgb = text_color
        p.alignment = PP_ALIGN.CENTER
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    return circle

def add_header_bar(slide, title, subtitle=None):
    add_rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.2), PRIMARY)
    add_rect(slide, Inches(0), Inches(1.2), Inches(13.333), Inches(0.04), GOLD)
    add_text(slide, Inches(0.6), Inches(0.2), Inches(8.5), Inches(0.55), title, size=26, bold=True, color=WHITE)
    if subtitle:
        add_text(slide, Inches(0.6), Inches(0.72), Inches(8.5), Inches(0.35), subtitle, size=12, color=ACCENT_LIGHT)

def add_footer(slide, num, total=7):
    add_rect(slide, Inches(0), Inches(7.2), Inches(13.333), Inches(0.3), PRIMARY)
    add_text(slide, Inches(0.5), Inches(7.22), Inches(6), Inches(0.25),
             "Mukesh Kumar  |  Functional Test Analyst  |  Performance Review FY 2025-26",
             size=8, color=MEDIUM_GRAY)
    add_text(slide, Inches(10.5), Inches(7.22), Inches(2.5), Inches(0.25),
             f"Slide {num} of {total}", size=8, color=MEDIUM_GRAY, align=PP_ALIGN.RIGHT)

def add_card_with_header(slide, left, top, width, height, title, items, header_color=ACCENT):
    add_rounded_rect(slide, left + Inches(0.04), top + Inches(0.04), width, height, RGBColor(0xD0, 0xD5, 0xDB))
    add_rounded_rect(slide, left, top, width, height, CARD_BG)
    add_rounded_rect(slide, left, top, width, Inches(0.5), header_color)
    add_text(slide, left + Inches(0.2), top + Inches(0.07), width - Inches(0.4), Inches(0.4), title, size=14, bold=True, color=WHITE)
    y = top + Inches(0.65)
    for item in items:
        dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, left + Inches(0.2), y + Inches(0.06), Inches(0.1), Inches(0.1))
        dot.fill.solid()
        dot.fill.fore_color.rgb = header_color
        dot.line.fill.background()
        add_text(slide, left + Inches(0.4), y, width - Inches(0.6), Inches(0.3), item, size=11, color=DARK_GRAY)
        y += Inches(0.35)

def add_white_panel(slide, left, top, width, height):
    return add_rounded_rect(slide, left, top, width, height, CARD_BG)


# =============================================
# SLIDE 1 - Title Slide (Light background for logo visibility)
# =============================================
slide1 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide1, OFF_WHITE)

add_rect(slide1, Inches(0), Inches(0), Inches(0.35), Inches(7.5), PRIMARY)
add_rect(slide1, Inches(0), Inches(0), Inches(13.333), Inches(0.04), GOLD)
add_rect(slide1, Inches(0), Inches(7.46), Inches(13.333), Inches(0.04), GOLD)

add_white_panel(slide1, Inches(1.5), Inches(0.8), Inches(11.5), Inches(6.0))
add_rect(slide1, Inches(1.5), Inches(0.8), Inches(11.5), Inches(0.06), PRIMARY)

try:
    slide1.shapes.add_picture(MYCLOUD_LOGO, Inches(3.8), Inches(1.2), height=Inches(1.0))
    slide1.shapes.add_picture(PROLOGIC_LOGO, Inches(7.8), Inches(1.2), height=Inches(1.0))
except Exception as e:
    print(f"Logo error: {e}")

add_rect(slide1, Inches(5.3), Inches(2.4), Inches(2.7), Inches(0.03), GOLD)
add_text(slide1, Inches(1.8), Inches(2.7), Inches(10.7), Inches(0.9), "Performance Review",
         size=44, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)

badge = add_rounded_rect(slide1, Inches(5.0), Inches(3.6), Inches(3.3), Inches(0.55), PRIMARY)
add_text(slide1, Inches(5.0), Inches(3.63), Inches(3.3), Inches(0.5), "FY 2025 - 2026",
         size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

add_text(slide1, Inches(1.8), Inches(4.35), Inches(10.7), Inches(0.45), "Self-Assessment Presentation",
         size=18, color=DARK_GRAY, align=PP_ALIGN.CENTER)
add_rect(slide1, Inches(5.3), Inches(4.9), Inches(2.7), Inches(0.02), MEDIUM_GRAY)
add_text(slide1, Inches(1.8), Inches(5.15), Inches(10.7), Inches(0.55), "Mukesh Kumar",
         size=30, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)
add_text(slide1, Inches(1.8), Inches(5.65), Inches(10.7), Inches(0.4), "Functional Test Analyst",
         size=16, color=DARK_GRAY, align=PP_ALIGN.CENTER)
add_text(slide1, Inches(1.8), Inches(6.05), Inches(10.7), Inches(0.35), "Review Period: April 2025 - March 2026",
         size=12, color=MEDIUM_GRAY, align=PP_ALIGN.CENTER)

# =============================================
# SLIDE 2 - Role & Responsibilities
# =============================================
slide2 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide2, LIGHT_BG)
add_header_bar(slide2, "My Role & Responsibilities", "Functional Test Analyst  |  Quality Assurance & Testing")

responsibilities = [
    "Analyze business requirements and prepare test scenarios using ChatGPT.",
    "Perform Functional, Regression, Integration, and UAT testing.",
    "Validate new features and enhancements before production release.",
    "Identify, track, and verify defects to ensure timely resolution.",
    "Collaborate with Business Analysts, Developers, and Product teams.",
    "Support production deployments and release validation.",
    "Ensure delivery of high-quality software within sprint timelines.",
]

add_white_panel(slide2, Inches(0.5), Inches(1.5), Inches(12.3), Inches(5.5))

y_pos = Inches(1.75)
for i, resp in enumerate(responsibilities):
    if i % 2 == 0:
        add_rect(slide2, Inches(0.7), y_pos - Inches(0.05), Inches(11.9), Inches(0.55), ACCENT_LIGHT)
    add_circle(slide2, Inches(0.85), y_pos + Inches(0.02), Inches(0.38), PRIMARY, str(i+1), 11)
    add_text(slide2, Inches(1.45), y_pos + Inches(0.05), Inches(10.5), Inches(0.4), resp, size=14, color=BLACK)
    y_pos += Inches(0.65)

add_footer(slide2, 2)

# =============================================
# SLIDE 3 - Key Contributions
# =============================================
slide3 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide3, LIGHT_BG)
add_header_bar(slide3, "Key Contributions During FY 2025-26", "Sprint Delivery & Quality Assurance")

banner = add_rounded_rect(slide3, Inches(0.5), Inches(1.45), Inches(4.5), Inches(0.5), GREEN)
add_text(slide3, Inches(0.7), Inches(1.48), Inches(4.1), Inches(0.45), "9 Sprint Releases Successfully Delivered",
         size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

sprints_left = [
    ("Sprint 4B.08", "HDFC SmartPay, Malay, Malaysian E-invoicing, Credit Limit for AR, WebAPI2.0"),
    ("Sprint 4B.1B", "Sprint 4B enhancements and refinements"),
    ("Sprint 4C", "Check/Kot Reconciliation, Advance Deposit Due, Monthly Rate, MS Dynamics, Room Cleaning"),
    ("Sprint 4C.1A", "Guest Satisfaction Survey Report"),
]

sprints_right = [
    ("Sprint 4D", "HSN Summary Report, GHA Discovery, ORAI WhatsApp, MyCloud Spark"),
    ("Sprint 4D.1A", "POS FnB Dashboard API"),
    ("Sprint 4D.1B", "KSA Report (Without E-invoice)"),
    ("Sprint 5", "GST Invoice - CLBNTX (Club Non Tax) & CLBTXT (Club Taxes by Type)"),
    ("Sprint 5A", "Activity/Transaction Logs, IP Validation on new login"),
]

add_white_panel(slide3, Inches(0.5), Inches(2.15), Inches(6.1), Inches(4.2))
y = Inches(2.35)
for sprint, desc in sprints_left:
    add_rounded_rect(slide3, Inches(0.7), y, Inches(1.5), Inches(0.3), PRIMARY)
    add_text(slide3, Inches(0.72), y + Inches(0.01), Inches(1.46), Inches(0.28), sprint, size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide3, Inches(2.35), y - Inches(0.03), Inches(4.1), Inches(0.55), desc, size=11, color=DARK_GRAY)
    y += Inches(0.78)

add_white_panel(slide3, Inches(6.8), Inches(2.15), Inches(6.1), Inches(4.2))
y = Inches(2.35)
for sprint, desc in sprints_right:
    add_rounded_rect(slide3, Inches(7.0), y, Inches(1.5), Inches(0.3), PRIMARY)
    add_text(slide3, Inches(7.02), y + Inches(0.01), Inches(1.46), Inches(0.28), sprint, size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide3, Inches(8.65), y - Inches(0.03), Inches(4.1), Inches(0.55), desc, size=11, color=DARK_GRAY)
    y += Inches(0.78)

add_rounded_rect(slide3, Inches(0.5), Inches(6.55), Inches(12.3), Inches(0.5), GREEN_LIGHT)
add_text(slide3, Inches(0.8), Inches(6.58), Inches(11.8), Inches(0.45),
         "Successfully validated sprint deliverables while maintaining software quality and supporting on-time production releases.",
         size=12, bold=True, color=GREEN_DARK, align=PP_ALIGN.CENTER)

add_footer(slide3, 3)

# =============================================
# SLIDE 4 - Major Project & Interface Deliveries
# =============================================
slide4 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide4, LIGHT_BG)
add_header_bar(slide4, "Major Project & Interface Deliveries", "Key Integrations & Business Value")

add_white_panel(slide4, Inches(0.5), Inches(1.5), Inches(6.1), Inches(3.8))
add_text(slide4, Inches(0.8), Inches(1.65), Inches(5.5), Inches(0.35), "Key Integrations Successfully Tested",
         size=15, bold=True, color=PRIMARY)

integrations = [
    ("Malaysia E-Invoice Integration", "Seamless e-invoicing compliance"),
    ("HDFC CC Avenue Payment Interface", "Secure payment processing"),
    ("Microsoft Dynamics Interface Integration", "ERP system connectivity"),
    ("GHA Discovery Interface", "Hotel distribution channel"),
    ("ORAI WhatsApp Interface", "Customer communication platform"),
]

int_colors = [ACCENT, GREEN, PURPLE, ORANGE, TEAL]
y = Inches(2.1)
for i, (name, desc) in enumerate(integrations):
    add_rect(slide4, Inches(0.8), y, Inches(0.06), Inches(0.5), int_colors[i])
    add_text(slide4, Inches(1.05), y - Inches(0.02), Inches(5.2), Inches(0.28), name, size=12, bold=True, color=BLACK)
    add_text(slide4, Inches(1.05), y + Inches(0.24), Inches(5.2), Inches(0.22), desc, size=10, color=MEDIUM_GRAY)
    y += Inches(0.58)

add_white_panel(slide4, Inches(6.8), Inches(1.5), Inches(6.1), Inches(3.8))
add_text(slide4, Inches(7.1), Inches(1.65), Inches(5.5), Inches(0.35), "Business Value Delivered",
         size=15, bold=True, color=PRIMARY)

values = [
    "Ensured seamless integration with third-party systems.",
    "Improved business process automation and customer experience.",
    "Supported stable and successful production deployments.",
    "Minimized production defects through comprehensive functional testing.",
]

y = Inches(2.15)
for val in values:
    add_circle(slide4, Inches(7.2), y + Inches(0.04), Inches(0.2), GREEN, "", 8)
    add_text(slide4, Inches(7.6), y, Inches(5.1), Inches(0.4), val, size=12, color=BLACK)
    y += Inches(0.55)

add_white_panel(slide4, Inches(0.5), Inches(5.55), Inches(12.3), Inches(1.4))
add_rect(slide4, Inches(0.5), Inches(5.55), Inches(0.06), Inches(1.4), GOLD)
add_text(slide4, Inches(0.9), Inches(5.7), Inches(11.5), Inches(0.35), "Impact Summary",
         size=15, bold=True, color=PRIMARY)
add_text(slide4, Inches(0.9), Inches(6.05), Inches(11.5), Inches(0.75),
         "All 5 major integrations were tested and deployed to production with zero critical defects. Each integration improved operational efficiency and enhanced the end-user experience across multiple business verticals.",
         size=12, color=DARK_GRAY)

add_footer(slide4, 4)

# =============================================
# SLIDE 5 - Knowledge Sharing
# =============================================
slide5 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide5, LIGHT_BG)
add_header_bar(slide5, "Knowledge Sharing & Team Contribution", "Mentoring, Collaboration & Team Building")

add_card_with_header(slide5, Inches(0.5), Inches(1.5), Inches(6.1), Inches(3.2), "Mentoring & Collaboration", [
    "Provided training and functional guidance on MyCloud and WebWish products.",
    "Supported team members: Sandeep & Archana.",
    "Conducted product knowledge transfer sessions.",
    "Guided team members on testing processes and application functionality.",
], header_color=ACCENT)

add_card_with_header(slide5, Inches(6.8), Inches(1.5), Inches(6.1), Inches(3.2), "Key Contributions", [
    "Assisted with day-to-day testing activities.",
    "Helped improve team productivity and onboarding efficiency.",
    "Encouraged collaboration and knowledge sharing across the QA team.",
    "Fostered a culture of continuous learning.",
], header_color=GREEN)

add_white_panel(slide5, Inches(1.2), Inches(5.0), Inches(10.9), Inches(1.9))
add_rect(slide5, Inches(1.2), Inches(5.0), Inches(0.06), Inches(1.9), GOLD)
add_text(slide5, Inches(1.8), Inches(5.2), Inches(9.8), Inches(0.5),
         "\"A team that shares knowledge grows together.\"",
         size=20, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)
add_text(slide5, Inches(1.8), Inches(5.75), Inches(9.8), Inches(0.8),
         "Committed to building a stronger QA team through mentorship, guidance, and collaborative testing practices that elevate overall product quality.",
         size=12, color=DARK_GRAY, align=PP_ALIGN.CENTER)

add_footer(slide5, 5)

# =============================================
# SLIDE 6 - Key Strengths & Future Goals
# =============================================
slide6 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide6, LIGHT_BG)
add_header_bar(slide6, "Key Strengths & Future Goals", "Current Capabilities & Growth Roadmap")

add_white_panel(slide6, Inches(0.5), Inches(1.5), Inches(6.1), Inches(3.0))
add_rounded_rect(slide6, Inches(0.5), Inches(1.5), Inches(6.1), Inches(0.5), GREEN)
add_text(slide6, Inches(0.7), Inches(1.53), Inches(5.7), Inches(0.45), "Strengths",
         size=15, bold=True, color=WHITE)

strengths = [
    "Strong functional testing expertise",
    "Ownership and accountability",
    "Timely sprint delivery",
    "Effective collaboration with cross-functional teams",
    "Continuous support for team development",
]

y = Inches(2.15)
for s in strengths:
    add_circle(slide6, Inches(0.8), y + Inches(0.03), Inches(0.2), GREEN, "+", 10)
    add_text(slide6, Inches(1.15), y, Inches(5.2), Inches(0.32), s, size=12, color=BLACK)
    y += Inches(0.42)

add_white_panel(slide6, Inches(6.8), Inches(1.5), Inches(6.1), Inches(3.0))
add_rounded_rect(slide6, Inches(6.8), Inches(1.5), Inches(6.1), Inches(0.5), ACCENT)
add_text(slide6, Inches(7.0), Inches(1.53), Inches(5.7), Inches(0.45), "Focus Areas for FY 2026-27",
         size=15, bold=True, color=WHITE)

goals = [
    "Enhance automation testing skills.",
    "Improve test execution efficiency.",
    "Strengthen API and integration testing capabilities.",
    "Continue mentoring team members.",
    "Contribute to process improvements and quality initiatives.",
]

y = Inches(2.15)
for g in goals:
    add_rounded_rect(slide6, Inches(7.1), y + Inches(0.04), Inches(0.18), Inches(0.18), ACCENT)
    add_text(slide6, Inches(7.45), y, Inches(5.2), Inches(0.32), g, size=12, color=BLACK)
    y += Inches(0.42)

add_white_panel(slide6, Inches(0.5), Inches(4.75), Inches(12.3), Inches(2.25))
add_text(slide6, Inches(0.8), Inches(4.9), Inches(11.8), Inches(0.4), "Growth Roadmap FY 2026-27",
         size=16, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)

roadmap_items = [
    ("Automation\nTesting", ACCENT),
    ("API & Integration\nTesting", GREEN),
    ("Test Efficiency\nImprovement", GOLD_DARK),
    ("Team\nMentoring", PURPLE),
    ("Process\nImprovement", RED_ACCENT),
]

x = Inches(0.8)
for label, clr in roadmap_items:
    add_rounded_rect(slide6, x, Inches(5.45), Inches(2.2), Inches(1.2), clr)
    add_text(slide6, x + Inches(0.1), Inches(5.55), Inches(2.0), Inches(1.0), label,
             size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    x += Inches(2.4)

add_footer(slide6, 6)

# =============================================
# SLIDE 7 - Thank You (Light background for logo visibility)
# =============================================
slide7 = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide7, OFF_WHITE)

add_rect(slide7, Inches(0), Inches(0), Inches(0.35), Inches(7.5), PRIMARY)
add_rect(slide7, Inches(0), Inches(0), Inches(13.333), Inches(0.04), GOLD)
add_rect(slide7, Inches(0), Inches(7.46), Inches(13.333), Inches(0.04), GOLD)

add_white_panel(slide7, Inches(1.5), Inches(0.8), Inches(11.5), Inches(6.0))
add_rect(slide7, Inches(1.5), Inches(0.8), Inches(11.5), Inches(0.06), PRIMARY)

try:
    slide7.shapes.add_picture(MYCLOUD_LOGO, Inches(4.0), Inches(1.2), height=Inches(0.9))
    slide7.shapes.add_picture(PROLOGIC_LOGO, Inches(8.0), Inches(1.2), height=Inches(0.9))
except:
    pass

add_rect(slide7, Inches(5.3), Inches(2.3), Inches(2.7), Inches(0.03), GOLD)
add_text(slide7, Inches(1.8), Inches(2.6), Inches(10.7), Inches(1), "Thank You",
         size=52, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)
add_rect(slide7, Inches(5.3), Inches(3.55), Inches(2.7), Inches(0.02), MEDIUM_GRAY)
add_text(slide7, Inches(1.8), Inches(3.8), Inches(10.7), Inches(0.55), "Mukesh Kumar",
         size=28, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)
add_text(slide7, Inches(1.8), Inches(4.35), Inches(10.7), Inches(0.4), "Functional Test Analyst",
         size=16, color=DARK_GRAY, align=PP_ALIGN.CENTER)

qa = add_rounded_rect(slide7, Inches(5.0), Inches(5.1), Inches(3.3), Inches(0.55), PRIMARY)
add_text(slide7, Inches(5.0), Inches(5.13), Inches(3.3), Inches(0.5), "Questions & Discussion",
         size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# =============================================
# SAVE
# =============================================
output_path = os.path.join("C:/Users/sachin/Downloads", "Performance_Review_FY2025_Mukesh.pptx")
prs.save(output_path)
print(f"PPT saved successfully at: {output_path}")
