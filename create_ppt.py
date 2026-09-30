from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ─── COLOR PALETTE ───
DARK_NAVY    = RGBColor(0x0D, 0x1B, 0x2A)
MID_NAVY     = RGBColor(0x1B, 0x2A, 0x4A)
ACCENT_BLUE  = RGBColor(0x00, 0x7A, 0xCC)
LIGHT_BLUE   = RGBColor(0x00, 0xA3, 0xE0)
ACCENT_ORANGE= RGBColor(0xFF, 0x6B, 0x35)
ACCENT_GREEN = RGBColor(0x2E, 0xCC, 0x71)
ACCENT_RED   = RGBColor(0xE7, 0x4C, 0x3C)
WHITE        = RGBColor(0xFF, 0xFF, 0xFF)
NEAR_WHITE   = RGBColor(0xF0, 0xF4, 0xF8)
LIGHT_GRAY   = RGBColor(0xE8, 0xEC, 0xF1)
MID_GRAY     = RGBColor(0x90, 0xA4, 0xAE)
DARK_GRAY    = RGBColor(0x37, 0x47, 0x4F)
TEXT_DARK    = RGBColor(0x26, 0x32, 0x38)

def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, fill_color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

def add_rounded_rect(slide, left, top, width, height, fill_color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

def add_tb(slide, left, top, width, height, text, font_size=18, bold=False, color=TEXT_DARK, align=PP_ALIGN.LEFT, font_name='Calibri'):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.alignment = align
    return tb

def add_header(slide, title, subtitle=None):
    add_rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.15), DARK_NAVY)
    add_rect(slide, Inches(0), Inches(1.15), Inches(13.333), Inches(0.06), ACCENT_ORANGE)
    add_tb(slide, Inches(0.6), Inches(0.2), Inches(12), Inches(0.7), title, 30, True, WHITE)
    if subtitle:
        add_tb(slide, Inches(0.6), Inches(0.65), Inches(12), Inches(0.4), subtitle, 14, False, RGBColor(0xB0, 0xBE, 0xC5))

def add_footer(slide):
    add_rect(slide, Inches(0), Inches(7.2), Inches(13.333), Inches(0.3), DARK_NAVY)
    add_tb(slide, Inches(0.5), Inches(7.2), Inches(5), Inches(0.3), 'Flutter Touche v1.0.16  |  Release Notes', 8, False, MID_GRAY)
    add_tb(slide, Inches(8), Inches(7.2), Inches(5), Inches(0.3), 'MYCloud PMS  |  PFI Hospitality Solutions', 8, False, MID_GRAY, PP_ALIGN.RIGHT)

def add_screenshot_placeholder(slide, left, top, width, height, label='[Add Screenshot Here]'):
    shape = add_rounded_rect(slide, left, top, width, height, NEAR_WHITE)
    shape.line.fill.solid()
    shape.line.color.rgb = LIGHT_GRAY
    shape.line.width = Pt(2)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    p = tf.paragraphs[0]
    p.text = label
    p.font.size = Pt(13)
    p.font.color.rgb = MID_GRAY
    p.font.name = 'Calibri'
    p.font.italic = True

def add_bullet_list(slide, left, top, width, height, items, font_size=13, color=TEXT_DARK):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f'\u25b8  {item}'
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = 'Calibri'
        p.space_after = Pt(4)
    return tb

def add_info_card(slide, left, top, width, height, title, body, accent=ACCENT_BLUE):
    card = add_rounded_rect(slide, left, top, width, height, WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, left, top, Inches(0.06), height, accent)
    add_tb(slide, left + Inches(0.25), top + Inches(0.12), width - Inches(0.4), Inches(0.35), title, 14, True, accent)
    add_tb(slide, left + Inches(0.25), top + Inches(0.45), width - Inches(0.4), height - Inches(0.55), body, 11, False, DARK_GRAY)

def add_tag(slide, left, top, text, bg_color=ACCENT_BLUE, text_color=WHITE):
    shape = add_rounded_rect(slide, left, top, Inches(len(text)*0.085 + 0.3), Inches(0.3), bg_color)
    tf = shape.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(9)
    p.font.bold = True
    p.font.color.rgb = text_color
    p.font.name = 'Calibri'
    p.alignment = PP_ALIGN.CENTER

# ═══════════════════════════════════════════════════════════════
# SLIDE 1: TITLE
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, DARK_NAVY)
add_rect(slide, Inches(0), Inches(3.4), Inches(13.333), Inches(0.05), ACCENT_ORANGE)
add_rect(slide, Inches(0), Inches(4.8), Inches(13.333), Inches(0.03), ACCENT_BLUE)
add_tb(slide, Inches(1), Inches(1.0), Inches(11.3), Inches(1.2), 'FLUTTER TOUCHE', 56, True, WHITE, PP_ALIGN.CENTER, 'Calibri Light')
add_tb(slide, Inches(1), Inches(2.0), Inches(11.3), Inches(0.8), 'Version 1.0.16', 40, False, LIGHT_BLUE, PP_ALIGN.CENTER, 'Calibri Light')
add_tb(slide, Inches(1), Inches(2.8), Inches(11.3), Inches(0.6), 'RELEASE NOTES', 22, True, RGBColor(0x78, 0x90, 0x9C), PP_ALIGN.CENTER)

labels = ['Functional Enhancements', 'New Features', 'Bug Fixes']
for i, lbl in enumerate(labels):
    x = Inches(3.2 + i * 2.6)
    add_rounded_rect(slide, x, Inches(3.7), Inches(2.3), Inches(0.7), MID_NAVY)
    add_tb(slide, x, Inches(3.78), Inches(2.3), Inches(0.55), lbl, 13, False, LIGHT_BLUE, PP_ALIGN.CENTER)

add_tb(slide, Inches(1), Inches(5.2), Inches(11.3), Inches(0.5), 'MYCloud PMS  |  PFI Hospitality Solutions', 16, False, RGBColor(0x60, 0x7D, 0x8B), PP_ALIGN.CENTER)
add_tb(slide, Inches(1), Inches(5.8), Inches(11.3), Inches(0.4), 'Confidential  |  Internal Use Only', 11, False, RGBColor(0x45, 0x5A, 0x64), PP_ALIGN.CENTER)

# ═══════════════════════════════════════════════════════════════
# SLIDE 2: TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Agenda', "What's Covered in This Release")
add_footer(slide)

toc = [
    ('01', 'Release Overview', 'Summary of changes and impact areas'),
    ('02', 'PMS Discount Mask', 'Auto-discount via department/account mapping'),
    ('03', 'UrbanPiper Enhancement', 'External order cancellation workflow'),
    ('04', 'LLM Help Center', 'AI-powered contextual assistance'),
    ('05', 'Cashier Reports UI', 'Redesigned Day Summary & Shift End reports'),
    ('06', 'Check Details & Rate Inclusive', 'Profile Preferences + Tax-inclusive pricing'),
    ('07', 'Opera Interface & Room Validation', 'Improved room search and validation'),
    ('08', 'Slip Printer & Print Indicator', 'Print overlapping fix and visual indicator'),
    ('09', 'Reprint KOT & Server Printing', 'Screen handling, validation, and fixes'),
    ('10', 'OAuth 2.0 Email Sending', 'Gmail/Azure OAuth authentication'),
    ('11', 'Bug Fixes & Defects', '20+ critical issue resolutions'),
    ('12', 'Additional Enhancements', 'Guest profiles, promotions, settlements'),
    ('13', 'Member Settlement & Promotions', 'MNNTTY validation + multi-item promo fix'),
]

for i, (num, title, desc) in enumerate(toc):
    col = 0 if i < 7 else 1
    row = i if i < 7 else i - 7
    x = Inches(0.5) if col == 0 else Inches(6.8)
    y = Inches(1.5 + row * 0.82)
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y + Inches(0.05), Inches(0.4), Inches(0.4))
    circle.fill.solid()
    circle.fill.fore_color.rgb = ACCENT_BLUE
    circle.line.fill.background()
    tf = circle.text_frame
    tf.paragraphs[0].text = num
    tf.paragraphs[0].font.size = Pt(11)
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].font.color.rgb = WHITE
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].font.name = 'Calibri'
    add_tb(slide, x + Inches(0.55), y, Inches(5.5), Inches(0.3), title, 14, True, TEXT_DARK)
    add_tb(slide, x + Inches(0.55), y + Inches(0.3), Inches(5.5), Inches(0.3), desc, 10, False, MID_GRAY)

# ═══════════════════════════════════════════════════════════════
# SLIDE 3: RELEASE OVERVIEW
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Release Overview', 'Flutter Touche v1.0.16 - Key Highlights')
add_footer(slide)

summary_box = add_rounded_rect(slide, Inches(0.5), Inches(1.4), Inches(12.3), Inches(1.0), NEAR_WHITE)
add_tb(slide, Inches(0.7), Inches(1.5), Inches(11.9), Inches(0.8),
       'This release focuses on improving system stability, ensuring better data consistency, and enhancing user experience across key operational modules.',
       14, False, DARK_GRAY, PP_ALIGN.LEFT)

stats = [
    ('20+', 'Functional\nEnhancements', ACCENT_BLUE),
    ('12+', 'New Features\nIntroduced', ACCENT_GREEN),
    ('16+', 'Bug Fixes\nResolved', ACCENT_ORANGE),
]
for i, (num, label, color) in enumerate(stats):
    x = Inches(0.5 + i * 4.2)
    card = add_rounded_rect(slide, x, Inches(2.7), Inches(3.9), Inches(1.5), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    card.line.width = Pt(1)
    add_rect(slide, x, Inches(2.7), Inches(3.9), Inches(0.06), color)
    add_tb(slide, x, Inches(2.85), Inches(3.9), Inches(0.7), num, 36, True, color, PP_ALIGN.CENTER, 'Calibri Light')
    add_tb(slide, x, Inches(3.5), Inches(3.9), Inches(0.6), label, 13, False, DARK_GRAY, PP_ALIGN.CENTER)

add_tb(slide, Inches(0.5), Inches(4.5), Inches(5), Inches(0.4), 'Key Areas of Impact', 18, True, TEXT_DARK)
areas = [
    'MYCloud PMS Integration - Discount masking and auto-application',
    'Rate Inclusive Pricing - Phase 2 across all Carte & Promotion workflows',
    'UrbanPiper/Deliverect - External order cancellation support',
    'LLM Help Center - AI-powered in-app contextual assistance',
    'Cashier Reports - Redesigned UI for Day Summary & Shift End',
    'OAuth 2.0 - Gmail and Azure email authentication',
    'Opera Interface - Room validation and settlement improvements',
    'Stability - Critical bug fixes across slip printer, KDS, and login'
]
add_bullet_list(slide, Inches(0.7), Inches(4.9), Inches(6), Inches(2.2), areas, 11, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(7.5), Inches(4.5), Inches(5.3), Inches(2.4), '[Add Release Overview Screenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 4: PMS DISCOUNT MASK
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'MYCloud PMS Discount Mask', 'Auto-Apply Department/Account-Wise Discounts')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'NEW FEATURE', ACCENT_GREEN)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6.2), Inches(0.6),
       'Automatically identifies and applies department/account-wise discounts during Room Inquiry and room charge posting.',
       13, False, DARK_GRAY)
add_info_card(slide, Inches(0.5), Inches(2.6), Inches(3.8), Inches(1.8),
              'Discount Configuration',
              '\u25b8  New discount code for WISH-based handling\n\u25b8  Discount Type: Adhoc Percentage\n\u25b8  Maintained through configured value field\n\u25b8  Available for MYCloud PMS integration only',
              ACCENT_BLUE)
add_info_card(slide, Inches(4.6), Inches(2.6), Inches(3.8), Inches(1.8),
              'Global Pointer Control',
              '\u25b8  Control Name: DSCMSK\n\u25b8  Function: Apply Discount Mask from WISH\n\u25b8  Auto-identifies discount via account/dept mapping\n\u25b8  Applied after saving the check',
              ACCENT_ORANGE)
add_tb(slide, Inches(0.5), Inches(4.6), Inches(4), Inches(0.35), 'Discount Application Flow', 16, True, TEXT_DARK)
flow_steps = [
    ('Room Selected', ACCENT_BLUE),
    ('Check PMS Config', MID_NAVY),
    ('Identify Discount %', ACCENT_ORANGE),
    ('Auto-Apply', ACCENT_GREEN),
    ('Save Check', DARK_NAVY),
]
for i, (step, color) in enumerate(flow_steps):
    x = Inches(0.5 + i * 2.4)
    shape = add_rounded_rect(slide, x, Inches(5.1), Inches(2.0), Inches(0.55), color)
    tf = shape.text_frame
    tf.paragraphs[0].text = step
    tf.paragraphs[0].font.size = Pt(11)
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].font.color.rgb = WHITE
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].font.name = 'Calibri'
    if i < len(flow_steps) - 1:
        add_tb(slide, x + Inches(2.0), Inches(5.15), Inches(0.4), Inches(0.4), '\u2192', 20, True, ACCENT_BLUE, PP_ALIGN.CENTER)
key_box = add_rounded_rect(slide, Inches(0.5), Inches(5.9), Inches(8.8), Inches(0.7), NEAR_WHITE)
add_tb(slide, Inches(0.7), Inches(5.95), Inches(8.4), Inches(0.55),
       'Key: Saved check reflects the applicable discount automatically - no manual selection required.',
       12, False, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(8.5), Inches(1.4), Inches(4.3), Inches(5.6), '[Add Discount Mask\nConfiguration Screenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 5: URBANPIPER ENHANCEMENT
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'UrbanPiper Enhancement', 'External Order Cancellation Workflow')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'ENHANCEMENT', ACCENT_BLUE)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6.5), Inches(0.6),
       'A new global control to support cancellation of entire external orders when customers decline modified orders due to unavailable items.',
       13, False, DARK_GRAY)

card1 = add_rounded_rect(slide, Inches(0.5), Inches(2.7), Inches(5.8), Inches(2.2), WHITE)
card1.line.fill.solid()
card1.line.color.rgb = LIGHT_GRAY
add_rect(slide, Inches(0.5), Inches(2.7), Inches(5.8), Inches(0.06), ACCENT_BLUE)
add_tb(slide, Inches(0.7), Inches(2.85), Inches(5.4), Inches(0.35), 'Control: MODCAN', 16, True, ACCENT_BLUE)
add_tb(slide, Inches(0.7), Inches(3.25), Inches(5.4), Inches(0.3), 'Default Value: N', 12, False, MID_GRAY)
add_tb(slide, Inches(0.7), Inches(3.6), Inches(5.4), Inches(0.3), 'N (Default) - Retain Existing Behavior', 13, True, TEXT_DARK)
add_tb(slide, Inches(0.7), Inches(3.9), Inches(5.4), Inches(0.7),
       'When one or more items are unavailable, the outlet can modify the order by voiding or substituting the affected items, and the remaining order continues to be processed.',
       11, False, DARK_GRAY)
add_tb(slide, Inches(0.7), Inches(4.5), Inches(5.4), Inches(0.3), 'Y - Allow Full Cancellation', 13, True, ACCENT_ORANGE)
add_tb(slide, Inches(0.7), Inches(4.8), Inches(5.4), Inches(0.7),
       'If the customer declines the modified order due to unavailable items, the system allows the entire external order to be cancelled. Cancellation request is sent to UrbanPiper/Deliverect, subject to platform support.',
       11, False, DARK_GRAY)
note_box = add_rounded_rect(slide, Inches(0.5), Inches(5.2), Inches(5.8), Inches(0.7), NEAR_WHITE)
add_tb(slide, Inches(0.7), Inches(5.25), Inches(5.4), Inches(0.55),
       'Integration: Works with UrbanPiper and Deliverect platforms. Subject to external platform support for cancellation requests.',
       11, False, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(6.8), Inches(1.4), Inches(6.0), Inches(5.6), '[Add External Order\nCancellation Workflow Screenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 6: LLM HELP CENTER
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'LLM Help Center', 'AI-Powered Contextual Assistance')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'NEW FEATURE', ACCENT_GREEN)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6), Inches(0.6),
       'A new LLM-based Help Center to provide users with contextual assistance directly within the application.',
       13, False, DARK_GRAY)
add_info_card(slide, Inches(0.5), Inches(2.6), Inches(3.8), Inches(2.0),
              'LLM URL Configuration',
              '\u25b8  New API config in appsettings.json\n\u25b8  LLMURL parameter\n\u25b8  Example:\n   http://192.168.0.4:82/PFIPL.ServiceCore.HelpCenter\n\u25b8  Must be accessible from app environment',
              ACCENT_BLUE)
add_info_card(slide, Inches(4.6), Inches(2.6), Inches(3.8), Inches(2.0),
              'Pointer Control: HELPCT',
              '\u25b8  Configuration: Y/N\n\u25b8  Default: N (Hidden)\n\u25b8  Y: Help Center enabled\n\u25b8  Change from N to Y to enable',
              ACCENT_ORANGE)
add_tb(slide, Inches(0.5), Inches(4.9), Inches(4), Inches(0.35), 'Help Center Access Flow', 16, True, TEXT_DARK)
access_steps = [
    ('Login', DARK_NAVY),
    ('Navigate to\nMain Outlet', ACCENT_BLUE),
    ('Click ? Icon', ACCENT_ORANGE),
    ('Open Help\nCenter', ACCENT_GREEN),
]
for i, (step, color) in enumerate(access_steps):
    x = Inches(0.5 + i * 2.4)
    shape = add_rounded_rect(slide, x, Inches(5.3), Inches(2.0), Inches(0.7), color)
    tf = shape.text_frame
    tf.paragraphs[0].text = step
    tf.paragraphs[0].font.size = Pt(11)
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].font.color.rgb = WHITE
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].font.name = 'Calibri'
    if i < len(access_steps) - 1:
        add_tb(slide, x + Inches(2.0), Inches(5.35), Inches(0.4), Inches(0.4), '\u2192', 20, True, ACCENT_BLUE, PP_ALIGN.CENTER)
add_screenshot_placeholder(slide, Inches(8.8), Inches(1.4), Inches(4.0), Inches(5.6), '[Add Help Center\nInterface Screenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 7: CASHIER REPORTS UI
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Cashier Reports - New UI Design', 'Redesigned Day Summary & Shift End Reports')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'UI ENHANCEMENT', ACCENT_BLUE)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6.5), Inches(0.6),
       'The existing Cashier Reports section has been enhanced with a new and improved user interface for the Day Summary and Shift End reports.',
       13, False, DARK_GRAY)
benefits = [
    ('Improved Readability', 'Report information is presented in a cleaner and more structured layout', ACCENT_BLUE),
    ('Better Data Visibility', 'Important report details are easier to identify and understand', ACCENT_GREEN),
    ('Enhanced UX', 'Updated design provides a more intuitive view of cashier-related information', ACCENT_ORANGE),
    ('Consistent Presentation', 'Day Summary and Shift End reports follow improved and consistent UI design', DARK_NAVY),
    ('Easy Comparison', 'Latest comparison view helps users understand and compare report info', LIGHT_BLUE),
]
for i, (title, desc, color) in enumerate(benefits):
    col = 0 if i < 3 else 1
    row = i if i < 3 else i - 3
    x = Inches(0.5) if col == 0 else Inches(4.5)
    y = Inches(2.6 + row * 0.85)
    card = add_rounded_rect(slide, x, y, Inches(3.8), Inches(0.75), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, y, Inches(0.06), Inches(0.75), color)
    add_tb(slide, x + Inches(0.2), y + Inches(0.05), Inches(3.5), Inches(0.3), title, 12, True, color)
    add_tb(slide, x + Inches(0.2), y + Inches(0.35), Inches(3.5), Inches(0.35), desc, 10, False, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(8.8), Inches(1.4), Inches(4.0), Inches(2.4), '[Add Day Summary\nScreenshot]')
add_screenshot_placeholder(slide, Inches(8.8), Inches(4.0), Inches(4.0), Inches(2.4), '[Add Shift End\nScreenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 8: CHECK DETAILS + RATE INCLUSIVE
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Check Details & Rate Inclusive Pricing (Phase 2)', 'Profile Preferences Enhancement + Tax-Inclusive Workflows')
add_footer(slide)

add_tag(slide, Inches(0.5), Inches(1.4), 'CHECK DETAILS', ACCENT_BLUE)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6), Inches(0.5),
       'A new enhancement in the Profile Preferences page to improve visibility of check-related information.',
       13, False, DARK_GRAY)
add_tb(slide, Inches(0.5), Inches(2.5), Inches(5), Inches(0.3), 'New Fields Added:', 14, True, TEXT_DARK)
add_bullet_list(slide, Inches(0.7), Inches(2.8), Inches(5), Inches(0.6), ['Server ID', 'Table Number'], 13, DARK_GRAY)

add_tag(slide, Inches(0.5), Inches(3.6), 'RATE INCLUSIVE (PHASE 2)', ACCENT_ORANGE)
add_tb(slide, Inches(0.5), Inches(4.1), Inches(6), Inches(0.5),
       'Global control to determine whether rates are displayed inclusive or exclusive of tax.',
       13, False, DARK_GRAY)
config_items = [
    ('Y = Rates Inclusive of Tax', 'Tax is included in the displayed item rate. Follows existing VAT configuration logic.'),
    ('N = Rates Exclusive of Tax', 'Tax is calculated separately and added to the displayed rate during checkout.'),
]
for i, (title, desc) in enumerate(config_items):
    x = Inches(0.5 + i * 4.5)
    card = add_rounded_rect(slide, x, Inches(4.6), Inches(4.2), Inches(1.0), NEAR_WHITE)
    add_tb(slide, x + Inches(0.2), Inches(4.65), Inches(3.8), Inches(0.3), f'INCRTE: {title}', 12, True, ACCENT_ORANGE)
    add_tb(slide, x + Inches(0.2), Inches(4.95), Inches(3.8), Inches(0.6), desc, 10, False, DARK_GRAY)

add_tb(slide, Inches(0.5), Inches(5.8), Inches(8), Inches(0.3), 'Applicable APIs:', 13, True, TEXT_DARK)
add_tb(slide, Inches(0.5), Inches(6.1), Inches(8), Inches(0.3), 'GetAllMenu  |  GetSubMenu  |  GetCarteDetails  |  ItemSearch  |  SaveCheck', 11, False, DARK_GRAY)
add_tb(slide, Inches(0.5), Inches(6.4), Inches(8), Inches(0.3), 'Workflows Updated:', 13, True, TEXT_DARK)
add_tb(slide, Inches(0.5), Inches(6.7), Inches(8), Inches(0.3), 'CarteItemDetails  |  ModifyCarte  |  MoveCarte  |  VoidCarte  |  UpdateCarte  |  Promotion Items  |  Package Items', 11, False, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(8.5), Inches(1.4), Inches(4.3), Inches(5.6), '[Add Rate Inclusive\nPricing Screenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 9: OPERA INTERFACE
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Opera Interface & Room Validation', 'Room Search, Posting & Settlement Improvements')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'ENHANCEMENT', ACCENT_BLUE)

features = [
    ('Room Validation', [
        'Improved room search and validation',
        'Prevents invalid room selection',
        'Ensures correct guest retrieval',
        'Confirmation on invalid room number entry'
    ], ACCENT_BLUE),
    ('Room Posting & Settlement', [
        'Enabled room modification during Check Modification',
        'Posting corrections aligned with legacy Windows workflow',
        'Improved room/account reference handling',
        'IRD UPI Settlement support'
    ], ACCENT_GREEN),
    ('India Slip Printer', [
        'Improved discount percentage printing',
        'Configurable GST display via GSTPRN control',
        'Improved printer communication/timeout handling',
        'Post-settlement delay resolution'
    ], ACCENT_ORANGE),
]
for i, (title, items, color) in enumerate(features):
    x = Inches(0.5 + i * 4.2)
    card = add_rounded_rect(slide, x, Inches(1.9), Inches(3.9), Inches(3.0), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, Inches(1.9), Inches(3.9), Inches(0.06), color)
    add_tb(slide, x + Inches(0.2), Inches(2.05), Inches(3.5), Inches(0.35), title, 16, True, color)
    add_bullet_list(slide, x + Inches(0.2), Inches(2.5), Inches(3.5), Inches(2.2), items, 11, DARK_GRAY)

note = add_rounded_rect(slide, Inches(0.5), Inches(5.2), Inches(12.3), Inches(0.8), NEAR_WHITE)
add_tb(slide, Inches(0.7), Inches(5.3), Inches(11.9), Inches(0.55),
       'Opera Room Inquiry UI: Updated with the latest UI design, including Reference and Billing Instruction fields.',
       12, False, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(0.5), Inches(6.1), Inches(12.3), Inches(0.9), '[Add Opera Interface Screenshot Here]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 10: SLIP PRINTER
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Slip Printer & Print Indicator', 'Printed Bill Indicator & Overlapping Issue Fix')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'BUG FIX + ENHANCEMENT', ACCENT_ORANGE)
add_info_card(slide, Inches(0.5), Inches(1.8), Inches(5.8), Inches(1.6),
              'Printed Bill Indicator on Dashboard',
              '\u25b8  Visual indicator to identify checks that have already been printed\n\u25b8  Reduces duplicate print attempts\n\u25b8  Improved visibility for cashier operations\n\u25b8  Fixed dashboard print indicators for clear identification',
              ACCENT_BLUE)
add_tb(slide, Inches(0.5), Inches(3.6), Inches(5.8), Inches(0.35), 'Slip Check Print - Overlapping Issue', 16, True, ACCENT_ORANGE)
add_info_card(slide, Inches(0.5), Inches(4.0), Inches(5.8), Inches(1.4),
              'Root Cause Identified',
              '\u25b8  Kitchen Master: Main Kitchen not configured\n\u25b8  Outlet Master: MasterKOT enabled without kitchen config\n\u25b8  2-second delay after KOT print allowed user actions during navigation\n\u25b8  Last Line Slip Printer API was not triggered',
              ACCENT_RED)
add_info_card(slide, Inches(0.5), Inches(5.5), Inches(5.8), Inches(1.4),
              'Fix Applied',
              '\u25b8  Removed 2-second delay - process is now sequential\n\u25b8  KOT print -> Master KOT -> Navigate to Open Checks\n\u25b8  Printer API triggered in correct sequence\n\u25b8  Prevents overlapping issue permanently',
              ACCENT_GREEN)
add_screenshot_placeholder(slide, Inches(6.8), Inches(1.4), Inches(6.0), Inches(5.6), '[Add Print Indicator\nScreenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 11: REPRINT KOT & SERVER NAME
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Reprint KOT & Server Name Printing', 'Screen Handling, Validation & Print Fixes')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'BUG FIX', ACCENT_RED)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6), Inches(0.35), 'Reprint KOT - Screen Hanging Issue', 16, True, TEXT_DARK)
add_info_card(slide, Inches(0.5), Inches(2.3), Inches(3.8), Inches(1.8),
              'Root Cause',
              '\u25b8  Kitchen Master: Main Kitchen not configured\n\u25b8  Outlet Master: MasterKOT enabled without kitchen config\n\u25b8  Android: Unavailable IP causes unresponsive popup',
              ACCENT_RED)
add_info_card(slide, Inches(4.6), Inches(2.3), Inches(3.8), Inches(1.8),
              'Enhancement Applied',
              '\u25b8  Browser: Clear validation message when kitchen config unavailable\n\u25b8  Android: Improved handling of unavailable IP addresses\n\u25b8  Prevents screen hanging and unnecessary delays',
              ACCENT_GREEN)
add_tb(slide, Inches(0.5), Inches(4.4), Inches(8), Inches(0.35), 'Additional Print & Config Fixes', 16, True, TEXT_DARK)
fixes = [
    'Server Name Printing: Fixed @03 print variable to display Server Name on Guest Checks and KOTs',
    'Item Sequence: Added ITMSRT global control to display POS items in Item Code order',
    'Guest Profile Discounts: Automatically applies eligible membership/guest profile discounts during billing',
    'Guest Name on Check: Support for displaying Guest Name and Room Number on check headers',
    'Special Account Settlement: PMS-driven is_pos_settlement_allowed validation',
    'Reprint Control: OutletKey9 configuration for Reprint Check dialog after settlement',
    'Guest Profile UI: Improved header alignment and Guest Feedback screen layout with Null Exception handling',
    'Link/Delink Room: Added LinkRoom/DelinkRoom functions and automatic guest linking from Room Inquiry',
]
add_bullet_list(slide, Inches(0.7), Inches(4.8), Inches(8), Inches(2.2), fixes, 11, DARK_GRAY)
add_screenshot_placeholder(slide, Inches(8.8), Inches(1.4), Inches(4.0), Inches(5.6), '[Add Reprint KOT\nScreenshot]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 12: OAUTH EMAIL
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'OAuth 2.0 Email Sending', 'Gmail, Azure & SMTP Authentication Support')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'NEW FEATURE', ACCENT_GREEN)
add_tb(slide, Inches(0.5), Inches(1.9), Inches(6), Inches(0.6),
       'A new email-sending mechanism supporting OAuth 2.0 authentication for modern email service providers, with backward compatibility.',
       13, False, DARK_GRAY)
methods = [
    ('Gmail OAuth 2.0', 'Secure authentication with Google\'s OAuth 2.0 protocol. Ideal for organizations using Google Workspace.', ACCENT_RED),
    ('Azure OAuth 2.0', 'Azure Active Directory authentication. Enterprise-grade security for Microsoft 365 environments.', ACCENT_BLUE),
    ('SMTP (Legacy)', 'Traditional SMTP authentication mode. Maintains backward compatibility with existing configurations.', MID_GRAY),
]
for i, (title, desc, color) in enumerate(methods):
    x = Inches(0.5 + i * 4.2)
    card = add_rounded_rect(slide, x, Inches(2.7), Inches(3.9), Inches(1.6), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, Inches(2.7), Inches(3.9), Inches(0.06), color)
    add_tb(slide, x + Inches(0.2), Inches(2.85), Inches(3.5), Inches(0.35), title, 15, True, color)
    add_tb(slide, x + Inches(0.2), Inches(3.25), Inches(3.5), Inches(0.9), desc, 11, False, DARK_GRAY)
add_info_card(slide, Inches(0.5), Inches(4.6), Inches(5.8), Inches(1.2),
              'Global Control: EMAUTH',
              '\u25b8  Default value: SMTP\n\u25b8  Determines which email service the application uses\n\u25b8  Supports Gmail OAuth, Azure OAuth, and SMTP\n\u25b8  Backward compatible with existing SMTP config',
              ACCENT_BLUE)
add_info_card(slide, Inches(6.6), Inches(4.6), Inches(5.8), Inches(1.2),
              'Interface Configuration Master',
              '\u25b8  New Parameter Key for email auth configuration\n\u25b8  Application identifies required email auth mechanism\n\u25b8  Based on configured value in Interface Config\n\u25b8  Seamless switching between authentication modes',
              ACCENT_ORANGE)
add_screenshot_placeholder(slide, Inches(0.5), Inches(6.0), Inches(12.3), Inches(1.0), '[Add Email Configuration Screenshot Here]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 13: BUG FIXES (Page 1)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Bug Fixes & Defects - Part 1', 'Critical Issue Resolutions')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'DEFECT FIXES', ACCENT_RED)
bugs_1 = [
    ('Browser Back Button', 'Improved workflow handling to prevent unexpected navigation, duplicate requests, and transaction inconsistencies during active Touche operations.'),
    ('QSR Final Settlement', 'Fixed an issue where the application remained stuck on the splash screen after settlement due to the NewCheck process not being triggered.'),
    ('Slip Printer Settlement Delay', 'Resolved post-settlement delays after the second confirmation prompt and improved printer communication/timeout handling.'),
    ('Radisson Mysore Login', 'Optimized initial login by controlling unnecessary API calls through server-side configuration.'),
    ('Host Machine IP Config', 'Updated login processing to skip local IP detection when the Host Machine configuration is enabled.'),
    ('Slip Printer Final Settlement', 'Corrected OutletKey9 and terminal print validation to ensure the required confirmation dialog is displayed correctly.'),
    ('Slip Printer Garbage Characters', 'Addressed garbage characters and printing failures for item names containing single or double quotes in the new Docker/Printing version.'),
    ('Opera Room Inquiry UI', 'Updated the Room Inquiry screen with the latest UI design, including Reference and Billing Instruction fields.'),
]
for i, (title, desc) in enumerate(bugs_1):
    col = 0 if i < 4 else 1
    row = i if i < 4 else i - 4
    x = Inches(0.5) if col == 0 else Inches(6.8)
    y = Inches(1.8 + row * 1.3)
    card = add_rounded_rect(slide, x, y, Inches(6.0), Inches(1.15), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, y, Inches(0.06), Inches(1.15), ACCENT_RED)
    add_tb(slide, x + Inches(0.2), y + Inches(0.05), Inches(5.6), Inches(0.3), title, 13, True, ACCENT_RED)
    add_tb(slide, x + Inches(0.2), y + Inches(0.35), Inches(5.6), Inches(0.7), desc, 10, False, DARK_GRAY)

# ═══════════════════════════════════════════════════════════════
# SLIDE 14: BUG FIXES (Page 2)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Bug Fixes & Defects - Part 2', 'Additional Critical Resolutions')
add_footer(slide)
add_tag(slide, Inches(0.5), Inches(1.4), 'DEFECT FIXES', ACCENT_RED)
bugs_2 = [
    ('Package Punch', 'Fixed regression issues affecting Fixed Package Punch functionality after the Rate Inclusive enhancement.'),
    ('Android Package', 'Fixed default package loading and Add-on Item Punch functionality on Android devices.'),
    ('Void & Move Item', 'Resolved Web Application regression issues affecting Void Item and Move Item functionality.'),
    ('Combo & AlLaCarte Items', 'Restored correct processing and ordering functionality for Combo and AlLaCarte items.'),
    ('Loader Screen Freeze', 'Fixed loading and refresh issues affecting Void, Move, MergeCheck, ImportCheck, and TableLayout workflows.'),
    ('Delivery Outlet Manual Orders', 'Fixed default profile mapping and improved handling of blank/incomplete database records.'),
    ('Night Audit Purge', 'Updated the TH15Q_04 stored procedure to include missing tables in the Night Audit purge process.'),
    ('Web Touche Scrollbar', 'Fixed the vertical scrollbar issue to ensure all icons and menu options are accessible without browser zoom.'),
    ('GST Export', 'Fixed the GST Export to WISH Tables process by correcting the GDCURL configuration and GST service handling.'),
    ('Item Master', 'Restored default value loading and the default checkbox when creating new items.'),
    ('Menu Configuration', 'Fixed Range Master validation issues preventing creation of new Menu Heads.'),
    ('Discount Validation', 'Identified issues requiring review for discounted AlLaCarte item validation and discount limit calculation.'),
]
for i, (title, desc) in enumerate(bugs_2):
    col = 0 if i < 6 else 1
    row = i if i < 6 else i - 6
    x = Inches(0.5) if col == 0 else Inches(6.8)
    y = Inches(1.8 + row * 0.88)
    card = add_rounded_rect(slide, x, y, Inches(6.0), Inches(0.78), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, y, Inches(0.06), Inches(0.78), ACCENT_RED)
    add_tb(slide, x + Inches(0.2), y + Inches(0.03), Inches(5.6), Inches(0.28), title, 12, True, ACCENT_RED)
    add_tb(slide, x + Inches(0.2), y + Inches(0.32), Inches(5.6), Inches(0.42), desc, 9.5, False, DARK_GRAY)

# ═══════════════════════════════════════════════════════════════
# SLIDE 15: ADDITIONAL ENHANCEMENTS
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Additional Enhancements', 'Guest Profiles, Promotions, Settlements & More')
add_footer(slide)
enhancements = [
    ('Guest Profile Discounts', 'Automatically applies eligible membership/guest profile discounts during billing', ACCENT_BLUE),
    ('Guest Name on Check', 'Display Guest Name and Room Number on check headers through configuration', ACCENT_BLUE),
    ('Link/Delink Room', 'Added LinkRoom/DelinkRoom functions and automatic guest linking from Room Inquiry', ACCENT_BLUE),
    ('KDS Item-wise Bumping', 'Added item-level bumping and improved CheckView handling for items without kitchen mapping', ACCENT_GREEN),
    ('UI Improvements', 'Improved responsive layouts and no-data screens across ImportCheck, ItemOutOfStock, MessageToKitchen, and ModifyCashier', ACCENT_GREEN),
    ('Invalid Room Validation', 'Added confirmation when an invalid room number is entered during NewCheck creation', ACCENT_ORANGE),
    ('Member Settlement (MNNTTY)', 'Added validation for MNNTTY global control - Required value: WEBCLB for Flutter and Club Integration', ACCENT_ORANGE),
    ('Promotion Feature Fix', 'Fixed multi-item promotion calculation where promotion items did not align correctly with main item quantity', ACCENT_ORANGE),
    ('Open Item Discount Fix', 'Fixed issues with multiple open items having different prices/descriptions on the same check', ACCENT_RED),
    ('Outlet Master Validation', 'Fixed Duplicate Prefix Validation - correct validation response for first prefix assignment', ACCENT_RED),
    ('Daily Report Fix', 'Resident/Non-Resident cover counts now display under their respective headers in the Cover Report', ACCENT_RED),
    ('Settlement Report', 'Added Cover column and Total Cover details for better visibility in Settlement Report', MID_GRAY),
    ('Item Master Validation', 'Added duplicate Item Master validation for manual entry and Excel upload', MID_GRAY),
    ('BASL Airport Check Printing', 'Improved check printing layout with configurable alignment and X/Y offsets', MID_GRAY),
]
for i, (title, desc, color) in enumerate(enhancements):
    col = 0 if i < 7 else 1
    row = i if i < 7 else i - 7
    x = Inches(0.5) if col == 0 else Inches(6.8)
    y = Inches(1.5 + row * 0.78)
    card = add_rounded_rect(slide, x, y, Inches(6.0), Inches(0.68), WHITE)
    card.line.fill.solid()
    card.line.color.rgb = LIGHT_GRAY
    add_rect(slide, x, y, Inches(0.06), Inches(0.68), color)
    add_tb(slide, x + Inches(0.2), y + Inches(0.03), Inches(5.6), Inches(0.28), title, 12, True, color)
    add_tb(slide, x + Inches(0.2), y + Inches(0.3), Inches(5.6), Inches(0.35), desc, 9.5, False, DARK_GRAY)

# ═══════════════════════════════════════════════════════════════
# SLIDE 16: MEMBER SETTLEMENT & PROMOTION DETAIL
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Member Settlement & Promotion Fixes', 'MNNTTY Validation + Multi-Item Promotion + Open Item Discounts')
add_footer(slide)

add_tag(slide, Inches(0.5), Inches(1.4), 'MEMBER SETTLEMENT', ACCENT_ORANGE)
add_info_card(slide, Inches(0.5), Inches(1.8), Inches(5.8), Inches(1.8),
              'MNNTTY Global Control Validation',
              '\u25b8  Global Control: MNNTTY\n\u25b8  Required Value: WEBCLB\n\u25b8  Applicable: Flutter and Club Integration\n\u25b8  If incorrect value (e.g., TCHPOS) is configured, system displays a clear validation message\n\u25b8  Once MNNTTY=WEBCLB is set correctly, Member Settlement processes successfully',
              ACCENT_ORANGE)
add_tag(slide, Inches(0.5), Inches(3.8), 'PROMOTION FIX', ACCENT_GREEN)
add_info_card(slide, Inches(0.5), Inches(4.2), Inches(5.8), Inches(1.5),
              'Multi-Item Promotion Calculation Fix',
              '\u25b8  Issue: When multiple quantities of main item were punched, promotion items list did not correctly align\n\u25b8  Result: Promotion items were not displayed or calculated correctly for multi-item promotions\n\u25b8  Fix: Promotion group linked with 2:1 promotion now works as expected',
              ACCENT_GREEN)
add_tag(slide, Inches(0.5), Inches(5.9), 'OPEN ITEM FIX', ACCENT_RED)
add_info_card(slide, Inches(0.5), Inches(6.3), Inches(5.8), Inches(0.8),
              'Open Item Discount & DSFXQT Configuration',
              '\u25b8  Fixed incorrect total amount calculation when multiple open items with different prices on same check\n\u25b8  Fixed discount picker using wrong open item price during Item-wise Fixed Discount',
              ACCENT_RED)
add_screenshot_placeholder(slide, Inches(6.8), Inches(1.4), Inches(6.0), Inches(5.6), '[Add Member Settlement\n& Promotion Screenshots]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 17: OUTLET MASTER & DAILY REPORT
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, WHITE)
add_header(slide, 'Outlet Master & Daily Report Fixes', 'Prefix Validation + Cover Report + Settlement Enhancements')
add_footer(slide)

add_tag(slide, Inches(0.5), Inches(1.4), 'OUTLET MASTER FIX', ACCENT_BLUE)
add_info_card(slide, Inches(0.5), Inches(1.8), Inches(5.8), Inches(2.0),
              'Duplicate Prefix Validation - Fixed',
              '\u25b8  Issue: Duplicate Prefix Validation issue on the Outlet Master screen\n\u25b8  Fix: When a new Outlet Master is created and the first prefix is assigned, the system now performs validation correctly\n\u25b8  If the prefix is already assigned to another outlet, the appropriate validation message is displayed\n\u25b8  If the prefix is available, the system allows the assignment to proceed\n\u25b8  System now displays the correct validation response based on current configuration, avoiding misleading messages',
              ACCENT_BLUE)
add_tag(slide, Inches(0.5), Inches(4.0), 'DAILY REPORT FIX', ACCENT_GREEN)
add_info_card(slide, Inches(0.5), Inches(4.4), Inches(5.8), Inches(1.5),
              'Resident/Non-Resident Sales Breakup Fix',
              '\u25b8  Issue: Cover Report under Resident and Non-Resident wise breakup section had display issues\n\u25b8  Fix: WebTouche Daily Report - Cover Report now displays Resident and Non-Resident cover counts under their respective headers\n\u25b8  Provides clearer visibility of cover information',
              ACCENT_GREEN)
add_tag(slide, Inches(0.5), Inches(6.1), 'SETTLEMENT REPORT', ACCENT_ORANGE)
add_info_card(slide, Inches(0.5), Inches(6.5), Inches(5.8), Inches(0.6),
              'Settlement Report Enhancement',
              '\u25b8  Added Cover column and Total Cover details for better visibility of cover information',
              ACCENT_ORANGE)
add_screenshot_placeholder(slide, Inches(6.8), Inches(1.4), Inches(6.0), Inches(5.6), '[Add Outlet Master\n& Report Screenshots]')

# ═══════════════════════════════════════════════════════════════
# SLIDE 18: THANK YOU
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, DARK_NAVY)
add_rect(slide, Inches(0), Inches(3.0), Inches(13.333), Inches(0.05), ACCENT_ORANGE)
add_rect(slide, Inches(0), Inches(4.8), Inches(13.333), Inches(0.03), ACCENT_BLUE)
add_tb(slide, Inches(1), Inches(1.5), Inches(11.3), Inches(1.2), 'Thank You', 56, True, WHITE, PP_ALIGN.CENTER, 'Calibri Light')
add_tb(slide, Inches(1), Inches(2.4), Inches(11.3), Inches(0.6), 'Flutter Touche Version 1.0.16', 28, False, LIGHT_BLUE, PP_ALIGN.CENTER)

summary_labels = ['12 Pages', '20+ Enhancements', '16+ Bug Fixes', '3 New Features']
for i, lbl in enumerate(summary_labels):
    x = Inches(1.5 + i * 2.8)
    shape = add_rounded_rect(slide, x, Inches(3.5), Inches(2.3), Inches(0.6), MID_NAVY)
    tf = shape.text_frame
    tf.paragraphs[0].text = lbl
    tf.paragraphs[0].font.size = Pt(13)
    tf.paragraphs[0].font.color.rgb = LIGHT_BLUE
    tf.paragraphs[0].font.name = 'Calibri'
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER

add_tb(slide, Inches(1), Inches(4.5), Inches(11.3), Inches(0.5), 'Questions & Feedback', 20, False, RGBColor(0xB0, 0xBE, 0xC5), PP_ALIGN.CENTER)
add_tb(slide, Inches(1), Inches(5.3), Inches(11.3), Inches(0.5), 'MYCloud PMS  |  PFI Hospitality Solutions', 16, False, RGBColor(0x60, 0x7D, 0x8B), PP_ALIGN.CENTER)
add_tb(slide, Inches(1), Inches(5.9), Inches(11.3), Inches(0.4), 'Confidential  |  Internal Use Only', 11, False, RGBColor(0x45, 0x5A, 0x64), PP_ALIGN.CENTER)

# ═══════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════
output_path = r'e:\Automation Project\WebWish 2\Flutter_Touche_v1.0.16_Release_Notes_v2.pptx'
prs.save(output_path)
print(f'Presentation saved: {output_path}')
print(f'Total slides: {len(prs.slides)}')
