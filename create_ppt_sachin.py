"""
Self-Assessment One-Pager – Sachin Kumar
Simple & Concise Single Slide | FY 2025-26
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

PROLOGIC_LOGO = r"C:\Users\sachin\Downloads\prologic_logo.png"

# Colors
NAVY    = RGBColor(0x0F, 0x1D, 0x3A)
PRI     = RGBColor(0x1A, 0x3C, 0x6E)
ACC     = RGBColor(0x2E, 0x86, 0xC1)
GRN     = RGBColor(0x1E, 0x8E, 0x4F)
PRP     = RGBColor(0x6C, 0x3C, 0x97)
ORN     = RGBColor(0xD3, 0x54, 0x00)
GOLD    = RGBColor(0xD4, 0xA0, 0x1E)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
BG      = RGBColor(0xF4, 0xF7, 0xFB)
BLK     = RGBColor(0x1C, 0x1C, 0x1C)
DGRAY   = RGBColor(0x3D, 0x3D, 0x3D)
MGRAY   = RGBColor(0x7F, 0x8C, 0x8D)
LGRAY   = RGBColor(0xDD, 0xDD, 0xDD)

sl = prs.slides.add_slide(prs.slide_layouts[6])

# Background
rect = lambda l,t,w,h,c: (sh := sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)) and (sh.fill.solid(), sh.fill.fore_color.rgb.__class__.__name__) and sh.line.fill.background() or sh
def rect(s,l,t,w,h,c):
    sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    sh.fill.solid(); sh.fill.fore_color.rgb = c; sh.line.fill.background()
    return sh

def rrect(s,l,t,w,h,c):
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    sh.fill.solid(); sh.fill.fore_color.rgb = c; sh.line.fill.background()
    return sh

def txt(s,l,t,w,h,text,sz=12,b=False,c=BLK,a=PP_ALIGN.LEFT,f="Calibri"):
    tb = s.shapes.add_textbox(l,t,w,h); tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text; p.font.size = Pt(sz); p.font.bold = b
    p.font.color.rgb = c; p.font.name = f; p.alignment = a
    return tb

def circle(s,l,t,sz,c):
    sh = s.shapes.add_shape(MSO_SHAPE.OVAL, l, t, sz, sz)
    sh.fill.solid(); sh.fill.fore_color.rgb = c; sh.line.fill.background()
    return sh

# ── HEADER ──
rect(sl, 0, 0, Inches(13.333), Inches(1.1), NAVY)
rect(sl, 0, Inches(1.1), Inches(13.333), Inches(0.04), GOLD)

try:
    sl.shapes.add_picture(PROLOGIC_LOGO, Inches(11.5), Inches(0.12), height=Inches(0.85))
except: pass

txt(sl, Inches(0.5), Inches(0.12), Inches(6), Inches(0.4),
    "Sachin Kumar", sz=22, b=True, c=WHITE)
txt(sl, Inches(0.5), Inches(0.55), Inches(8), Inches(0.25),
    "Automation Test Analyst  |  Prologic First  |  April 2025 – March 2026", sz=10, c=RGBColor(0xA0, 0xC0, 0xE0))

rrect(sl, Inches(6.5), Inches(0.25), Inches(1.8), Inches(0.38), ACC)
txt(sl, Inches(6.5), Inches(0.27), Inches(1.8), Inches(0.34),
    "Self-Assessment", sz=11, b=True, c=WHITE, a=PP_ALIGN.CENTER)

# ── MAIN CONTENT: 3 Columns ──

# ── Column 1: What I Do + Skills ──
c1 = Inches(0.5)

# Card 1: What I Do
rrect(sl, c1, Inches(1.35), Inches(3.9), Inches(2.6), WHITE)
rect(sl, c1, Inches(1.35), Inches(3.9), Inches(0.04), PRI)

txt(sl, c1 + Inches(0.15), Inches(1.45), Inches(3.6), Inches(0.3),
    "WHAT I DO", sz=10, b=True, c=PRI)
rect(sl, c1 + Inches(0.15), Inches(1.75), Inches(0.6), Inches(0.02), GOLD)

txt(sl, c1 + Inches(0.15), Inches(1.9), Inches(3.6), Inches(1.8),
    "Design and implement enterprise-level test "
    "automation solutions. Built a complete Playwright "
    "with TypeScript framework for the WebWish "
    "Hospitality PMS application. Integrated Agentic "
    "AI into the testing workflow to improve "
    "productivity and software quality.",
    sz=9, c=DGRAY)

# Card 2: Key Skills
rrect(sl, c1, Inches(4.15), Inches(3.9), Inches(2.65), WHITE)
rect(sl, c1, Inches(4.15), Inches(3.9), Inches(0.04), GRN)

txt(sl, c1 + Inches(0.15), Inches(4.25), Inches(3.6), Inches(0.3),
    "KEY SKILLS", sz=10, b=True, c=GRN)
rect(sl, c1 + Inches(0.15), Inches(4.55), Inches(0.6), Inches(0.02), GOLD)

skills = [
    ("Playwright + TypeScript", ACC),
    ("Selenium Java", PRI),
    ("API Testing", GRN),
    ("SQL", RGBColor(0x15, 0x95, 0x7C)),
    ("Git & GitHub", PRP),
    ("Jenkins CI/CD", ORN),
    ("Agentic AI", RGBColor(0xB8, 0x32, 0x26)),
    ("Prompt Engineering", RGBColor(0xB8, 0x86, 0x0B)),
]
y = Inches(4.7)
for i, (name, clr) in enumerate(skills):
    col = i % 2
    x = c1 + Inches(0.15) + col * Inches(1.9)
    if col == 0 and i > 0:
        y += Inches(0.3)
    circle(sl, x, y + Inches(0.03), Inches(0.1), clr)
    txt(sl, x + Inches(0.16), y, Inches(1.6), Inches(0.2), name, sz=8, c=DGRAY)

# ── Column 2: Key Contributions + AI Innovation ──
c2 = Inches(4.65)

# Card 3: Key Contributions
rrect(sl, c2, Inches(1.35), Inches(4.1), Inches(2.6), WHITE)
rect(sl, c2, Inches(1.35), Inches(4.1), Inches(0.04), ACC)

txt(sl, c2 + Inches(0.15), Inches(1.45), Inches(3.8), Inches(0.3),
    "KEY CONTRIBUTIONS", sz=10, b=True, c=ACC)
rect(sl, c2 + Inches(0.15), Inches(1.75), Inches(0.6), Inches(0.02), GOLD)

contribs = [
    "Built enterprise Playwright + TypeScript framework",
    "Developed WebWish PMS end-to-end automation",
    "Designed reusable Page Object Model architecture",
    "Created common utility libraries & components",
    "Improved code quality & scalability",
    "Reduced manual regression effort significantly",
]
y = Inches(1.85)
for text in contribs:
    circle(sl, c2 + Inches(0.15), y + Inches(0.04), Inches(0.08), ACC)
    txt(sl, c2 + Inches(0.3), y, Inches(3.6), Inches(0.2), text, sz=8, c=DGRAY)
    y += Inches(0.27)

# Card 4: AI Innovation
rrect(sl, c2, Inches(4.15), Inches(4.1), Inches(2.65), WHITE)
rect(sl, c2, Inches(4.15), Inches(4.1), Inches(0.04), PRP)

txt(sl, c2 + Inches(0.15), Inches(4.25), Inches(3.8), Inches(0.3),
    "AI INNOVATION", sz=10, b=True, c=PRP)
rect(sl, c2 + Inches(0.15), Inches(4.55), Inches(0.6), Inches(0.02), GOLD)

ai_items = [
    "Built AI Agents for automated test generation",
    "Used Prompt Engineering for daily workflows",
    "Integrated Playwright MCP Server",
    "Automated browser actions via natural language",
    "Generated automation code using AI (40% time saved)",
]
y = Inches(4.65)
for text in ai_items:
    circle(sl, c2 + Inches(0.15), y + Inches(0.04), Inches(0.08), PRP)
    txt(sl, c2 + Inches(0.3), y, Inches(3.6), Inches(0.2), text, sz=8, c=DGRAY)
    y += Inches(0.27)

# ── Column 3: Value + Goals ──
c3 = Inches(9.0)

# Card 5: Value Delivered
rrect(sl, c3, Inches(1.35), Inches(3.85), Inches(2.6), WHITE)
rect(sl, c3, Inches(1.35), Inches(3.85), Inches(0.04), ORN)

txt(sl, c3 + Inches(0.15), Inches(1.45), Inches(3.55), Inches(0.3),
    "VALUE DELIVERED", sz=10, b=True, c=ORN)
rect(sl, c3 + Inches(0.15), Inches(1.75), Inches(0.6), Inches(0.02), GOLD)

kpis = [("40%+", "Faster development"), ("Zero", "Production defects"),
        ("60%+", "Code reuse"), ("3x", "Regression speed")]
y = Inches(1.85)
for val, lbl in kpis:
    rrect(sl, c3 + Inches(0.15), y, Inches(3.55), Inches(0.38), BG)
    txt(sl, c3 + Inches(0.25), y + Inches(0.04), Inches(0.7), Inches(0.28),
        val, sz=11, b=True, c=ACC)
    txt(sl, c3 + Inches(1.0), y + Inches(0.07), Inches(2.6), Inches(0.25),
        lbl, sz=8, c=DGRAY)
    y += Inches(0.45)

# Card 6: Goals
rrect(sl, c3, Inches(4.15), Inches(3.85), Inches(2.65), WHITE)
rect(sl, c3, Inches(4.15), Inches(3.85), Inches(0.04), RGBColor(0xB8, 0x32, 0x26))

txt(sl, c3 + Inches(0.15), Inches(4.25), Inches(3.55), Inches(0.3),
    "GOALS FOR FY 2026-27", sz=10, b=True, c=RGBColor(0xB8, 0x32, 0x26))
rect(sl, c3 + Inches(0.15), Inches(4.55), Inches(0.6), Inches(0.02), GOLD)

goals = [
    "Increase automation coverage across WebWish",
    "Deeper AI integration into testing lifecycle",
    "Build more intelligent AI Agents",
    "Strengthen Jenkins CI/CD pipeline",
    "Expand API & self-healing automation",
    "Mentor team in Playwright & AI",
]
y = Inches(4.65)
for text in goals:
    circle(sl, c3 + Inches(0.15), y + Inches(0.04), Inches(0.08), RGBColor(0xB8, 0x32, 0x26))
    txt(sl, c3 + Inches(0.3), y, Inches(3.4), Inches(0.2), text, sz=8, c=DGRAY)
    y += Inches(0.27)

# ── FOOTER ──
rect(sl, 0, Inches(7.0), Inches(13.333), Inches(0.5), NAVY)
rect(sl, 0, Inches(7.0), Inches(13.333), Inches(0.03), GOLD)
txt(sl, Inches(0.5), Inches(7.12), Inches(6), Inches(0.25),
    "Sachin Kumar  |  Automation Test Analyst  |  Prologic First",
    sz=8, c=RGBColor(0xA0, 0xC0, 0xE0))
txt(sl, Inches(7.5), Inches(7.12), Inches(5.5), Inches(0.25),
    "Building scalable automation with Playwright, TypeScript & Agentic AI",
    sz=8, b=False, c=GOLD, a=PP_ALIGN.RIGHT)

# Save
out = os.path.join("C:/Users/sachin/Downloads", "Self_Assessment_Sachin_Simple.pptx")
prs.save(out)
print(f"\n✅ Saved: {out}\n")
