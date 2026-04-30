# 🎯 QUICK REFERENCE - Browser Ko Open Rakhne Ka Tarika

## Sabse Simple Tareeka

### 1️⃣ Browser Open Rakhne Ke Liye (isko use karo)

```powershell
$env:KEEP_BROWSER_OPEN='true'
npx playwright test tests/login.spec.ts --project=chromium --headed -g "TC_LOGIN_001" --workers=1
```

### 2️⃣ Browser Auto Close Ho (Default)

```powershell
npx playwright test tests/login.spec.ts --project=chromium --headed -g "TC_LOGIN_001" --workers=1
```

### 3️⃣ Agar 10 Seconds Wait Karna Ho Phir Close

```powershell
$env:PAUSE_ON_FINISH='10000'
npx playwright test tests/login.spec.ts --project=chromium --headed -g "TC_LOGIN_001" --workers=1
```

---

## PowerShell Script Use Karo (Aur Bhi Easy)

### Browser Open Rakhne Ke Liye:
```powershell
.\run-test-keep-browser-open.ps1 -TestFile "tests/login.spec.ts" -TestName "TC_LOGIN_001"
```

### Browser Auto Close (5 Seconds):
```powershell
.\run-test-keep-browser-open.ps1 -TestFile "tests/login.spec.ts" -TestName "TC_LOGIN_001" -NoKeepOpen
```

### Custom Pause Duration:
```powershell
.\run-test-keep-browser-open.ps1 -TestFile "tests/login.spec.ts" -NoKeepOpen -PauseDuration 15000
```

---

## Kya Hota Hai Browser Open Hone Par?

1. ✅ Test pura ho jaata hai
2. ✅ Purple debug panel (Playwright Inspector) khul jaata hai
3. ✅ Browser page visible hoti hai
4. ✅ Aap manually check kar sakte ho, elements inspect kar sakte ho
5. ⏭️ "Continue" button press karo ya Enter daab ke browser close karo

---

## Sabhi Test Files Mein Kaam Karega

✅ tests/login.spec.ts
✅ tests/property-selection.spec.ts  
✅ tests/note-templates.spec.ts
✅ tests/note-templates-create.spec.ts

---

## Examples

### Example 1: Sirf Login Test, Browser Open
```powershell
$env:KEEP_BROWSER_OPEN='true'
npx playwright test tests/login.spec.ts --project=chromium --headed -g "TC_LOGIN_001" --workers=1
```

### Example 2: Property Selection Test, Browser Open
```powershell
$env:KEEP_BROWSER_OPEN='true'
npx playwright test tests/property-selection.spec.ts --project=chromium --headed -g "PROP_001" --workers=1
```

### Example 3: Note Templates Test, Browser Open
```powershell
$env:KEEP_BROWSER_OPEN='true'
npx playwright test tests/note-templates.spec.ts --project=chromium --headed
```

### Example 4: Sab Tests Run, Browser Open
```powershell
$env:KEEP_BROWSER_OPEN='true'
npx playwright test --project=chromium --headed
```

---

## 🔄 Default Behavior (Kab Auto-Close Hota Hai)

Agar `KEEP_BROWSER_OPEN` set nahi karte ho:
- 5 seconds wait hota hai (aap dekh sakte ho result)
- Phir automatically browser close ho jaata hai

---

## ⚡ Sabse Quick Commands

**Browser Open Rakhna:**
```powershell
$env:KEEP_BROWSER_OPEN='true'; npx playwright test tests/login.spec.ts --project=chromium --headed
```

**Browser Auto Close:**
```powershell
npx playwright test tests/login.spec.ts --project=chromium --headed
```

---

## 📌 Zaroori Baat

- Hamesha `--headed` flag use karo taaki browser visible ho
- `KEEP_BROWSER_OPEN='true'` exactly ye hi likho (case-sensitive)
- Environment variable sirf usi PowerShell session mein apply hota hai

---

**Questions?** See `BROWSER_CONTROL.md` for detailed guide!

