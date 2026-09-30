from pathlib import Path
from pypdf import PdfReader
import re
import difflib

files = sorted(Path('.').glob('Archive Transaction Register*.pdf'))
print('FILES:', [f.name for f in files])

texts = []
for f in files:
    r = PdfReader(str(f))
    pages = [p.extract_text() or '' for p in r.pages]
    texts.append(pages)
    print(f'FILE: {f.name} | PAGES: {len(pages)}')

print('PAGE_COUNT_EQUAL:', len(texts[0]) == len(texts[1]))

mismatch_pages = []
for i in range(min(len(texts[0]), len(texts[1]))):
    a = re.sub(r'\s+', ' ', texts[0][i]).strip()
    b = re.sub(r'\s+', ' ', texts[1][i]).strip()
    if a != b:
        mismatch_pages.append(i+1)
print('MISMATCH_PAGES:', mismatch_pages)

first = mismatch_pages[0] if mismatch_pages else None
if first:
    a = re.sub(r'\s+', ' ', texts[0][first-1]).strip()
    b = re.sub(r'\s+', ' ', texts[1][first-1]).strip()
    print('FIRST_MISMATCH_PAGE:', first)
    print('HEADER_PART_EQUAL:', a.split('Printed on :',1)[0] == b.split('Printed on :',1)[0])
    print('A_PRINTED_ON:', a[a.find('Printed on :')+len('Printed on :'):a.find('Business date :')] if 'Printed on :' in a else 'N/A')
    print('B_PRINTED_ON:', b[b.find('Printed on :')+len('Printed on :'):b.find('Business date :')] if 'Printed on :' in b else 'N/A')
    diff = list(difflib.unified_diff(a.splitlines(), b.splitlines(), lineterm=''))
    print('DIFF_SAMPLE:')
    for line in diff[:20]:
        print(line)
else:
    print('ALL_PAGES_IDENTICAL')

full1 = '\n'.join(re.sub(r'\s+', ' ', t).strip() for t in texts[0])
full2 = '\n'.join(re.sub(r'\s+', ' ', t).strip() for t in texts[1])
print('FULL_TEXT_EQUAL:', full1 == full2)

# transaction-like block comparison by splitting on the report footer / every day subtotal boundary
# How many raw transaction rows are present in each PDF; compare unique voucher entries near dates
pattern = re.compile(r'\b\d{2}/\d{2}/\d{4}\b')
for idx, f in enumerate(files, start=1):
    r = PdfReader(str(f))
    all_text = '\n'.join((p.extract_text() or '') for p in r.pages)
    matches = pattern.findall(all_text)
    print(f'FILE:{f.name} | DATE_COUNT_IN_TEXT:{len(matches)} | UNIQUE_DATES:{len(set(matches))}')

# check if any report row differs beyond timestamp
for i in range(min(len(texts[0]), len(texts[1]))):
    if texts[0][i] != texts[1][i]:
        a = texts[0][i]
        b = texts[1][i]
        # collapse whitespace to compare structure not formatting
        if re.sub(r'\s+', ' ', a).strip() == re.sub(r'\s+', ' ', b).strip():
            continue
        # if only the footer timestamp differs, it will show as a difference in the last page only
        print(f'FIRST_NONTRIVIAL_PAGE_DIFFERENCE_AT:{i+1}')
        print('A_SNIPPET:', a[-500:])
        print('B_SNIPPET:', b[-500:])
        break
else:
    print('NO_NONTRIVIAL_PAGE_DIFFERENCE_FOUND')
