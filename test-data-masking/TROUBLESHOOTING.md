# Troubleshooting Data Masking

## Issue: No masking happening / No notification appearing

### Checklist:

#### 1. ✅ Is masking enabled?
Open VS Code Settings (`Ctrl+,`) and search for "Copy Info with Context"

**Required setting:**
```json
"copyInfoWithContext.enableDataMasking": true
```

**Default is `false`** - masking is opt-in for safety!

---

#### 2. ✅ Is the preset set correctly?
Check your masking preset:

```json
"copyInfoWithContext.maskingPreset": "financial"  // or "basic", "healthcare", "enterprise"
```

**NOT**:
```json
"copyInfoWithContext.maskingPreset": "none"  // This disables masking!
```

---

#### 3. ✅ Check if patterns are enabled
If using `custom` preset, make sure the specific pattern types are enabled:

```json
"copyInfoWithContext.maskingTypes": {
  "email": true,
  "phone": true,
  "australianBSB": true,
  "creditCard": true
  // ... etc
}
```

---

#### 4. ✅ Reload VS Code
After changing settings:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "Reload Window"
3. Press Enter

Or close and reopen VS Code.

---

## Quick Fix: Copy & Paste These Settings

### Option 1: Financial Services (Recommended for testing)
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": true
}
```

### Option 2: Enterprise (All Patterns)
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": true
}
```

---

## How to Apply Settings

### Method 1: UI Settings
1. Press `Ctrl+,` (Settings)
2. Search for "Copy Info with Context"
3. Check the box for "Enable Data Masking" ✅
4. Set "Masking Preset" to "financial" or "enterprise"
5. Close settings

### Method 2: JSON Settings (Recommended)
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "Preferences: Open User Settings (JSON)"
3. Add the settings from Option 1 or Option 2 above
4. Save the file
5. Reload VS Code window

---

## Testing the Fix

### Step 1: Open a test file
Open: `test-data-masking/financial-data.csv`

### Step 2: Select some data
Select rows 2-4 (the customer data)

### Step 3: Copy
Press `Ctrl+Alt+C` (or `Cmd+Alt+C` on Mac)

### Step 4: Check for indicators

**You should see:**

1. **Status Bar** (bottom right): `🛡️ 5 masked` (or similar number)

2. **Notification** (top right):
   ```
   Copied with 5 items masked: 2 emails, 1 bsb, 1 credit_card, 1 phone
   [Settings]
   ```

3. **Clipboard**: Paste the output - should see masked values like:
   ```
   j***@e***.com
   ***-*56
   **** **** **** 9010
   ```

---

## Still Not Working?

### Debug Steps:

#### 1. Check the Developer Console
1. Help menu → Toggle Developer Tools
2. Go to Console tab
3. Look for any errors related to "masking"

#### 2. Verify Extension is Active
1. View menu → Extensions
2. Search for "Copy Info with Context"
3. Make sure it's enabled (not disabled)

#### 3. Check VS Code Version
- Requires VS Code 1.74.0 or higher
- Check: Help → About

#### 4. Try a Different File Format
If CSV isn't working, try XML or JSON:
- Open `test-data-masking/customer-data.json`
- Select the entire file
- Copy with `Ctrl+Alt+C`

---

## Common Issues

### Issue: "Copied with 0 items masked"
**Cause**: Preset is set to "none" or patterns are disabled

**Fix**: Set preset to "financial", "healthcare", or "enterprise"

---

### Issue: Only emails are masked, not BSB or phone numbers
**Cause**: Preset is set to "basic"

**Fix**: Change to "financial" or "enterprise"

```json
"copyInfoWithContext.maskingPreset": "financial"
```

---

### Issue: Too much is being masked
**Cause**: Preset is set to "enterprise" or "strict" mode

**Fix**: Use "basic" preset or add allow list

```json
{
  "copyInfoWithContext.maskingPreset": "basic",
  "copyInfoWithContext.maskingAllowList": ["Status", "Type", "ID"]
}
```

---

### Issue: Specific columns not being masked in CSV
**Cause**: Column name not in detection patterns

**Fix**: Add to deny list

```json
{
  "copyInfoWithContext.maskingDenyList": [
    "YourColumnName",
    "AnotherColumn"
  ]
}
```

---

### Issue: No visual indicator in status bar
**Cause**: Status bar indicator disabled

**Fix**: Enable it

```json
{
  "copyInfoWithContext.showMaskingIndicator": true
}
```

---

## Expected Output Examples

### CSV (financial-data.csv)
**Before:**
```csv
john.doe@example.com,123-456,987654321,CUST-00012345,123 456 789,+61 412 345 678,4532 1234 5678 9010,Active
```

**After (partial strategy):**
```csv
j***@e***.com,***-*56,***321,C***5,*** *** ***,+61 *** ** **8,**** **** **** 9010,Active
```

**After (full strategy):**
```csv
***,***,***,***,***,***,***,Active
```

---

### JSON (customer-data.json)
**Before:**
```json
"email": "john.anderson@example.com",
"phone": "+61 412 345 678",
"bsb": "123-456"
```

**After (partial strategy):**
```json
"email": "j***@e***.com",
"phone": "+61 *** ** **8",
"bsb": "***-*56"
```

---

### XML (customer-data.xml)
**Before:**
```xml
<email>john.anderson@example.com</email>
<phone>+61 412 345 678</phone>
<bsb>123-456</bsb>
```

**After (partial strategy):**
```xml
<email>j***@e***.com</email>
<phone>+61 *** ** **8</phone>
<bsb>***-*56</bsb>
```

---

## Contact / Report Issues

If masking still isn't working after trying all the above:

1. Check the extension's GitHub Issues page
2. Include:
   - Your VS Code version
   - Your settings (JSON)
   - Which test file you tried
   - Screenshot of the output

---

## Quick Reference: All Settings

```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingMode": "auto",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingDenyList": [],
  "copyInfoWithContext.maskingAllowList": [],
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": true,
  "copyInfoWithContext.maskingCustomPatterns": []
}
```

---

Happy masking! 🎉
