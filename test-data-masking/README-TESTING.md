# Data Masking Test Files

This directory contains sample files to test the **Smart Data Masking** feature of the Copy Info with Context extension.

## 📁 Test Files Overview

### 1. **financial-data.csv** - Financial Services Data
Contains Australian banking information perfect for testing the `financial` preset.

**Sensitive Data Included:**
- ✅ Email addresses
- ✅ BSB codes (Australian)
- ✅ Bank account numbers
- ✅ Client/Customer numbers
- ✅ TFN (Tax File Numbers)
- ✅ Phone numbers (Australian format)
- ✅ Credit cards (Visa, MasterCard, Amex)

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Expected Result:** All sensitive columns will be masked while "Status" remains visible.

---

### 2. **healthcare-data.csv** - Healthcare/Medical Data
Contains patient information for testing the `healthcare` preset.

**Sensitive Data Included:**
- ✅ Patient names
- ✅ Email addresses
- ✅ Phone numbers
- ✅ Medicare numbers (Australian)
- ✅ Physical addresses

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "full"
}
```

**Expected Result:** All PII masked with full replacement (***).

---

### 3. **enterprise-data.csv** - Enterprise/HR Data
Contains employee information for testing custom deny lists.

**Sensitive Data Included:**
- ✅ Employee IDs
- ✅ Email addresses (personal and company)
- ✅ Phone numbers
- ✅ ABN (Australian Business Numbers)

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingDenyList": ["Email", "Phone", "ABN", "CompanyEmail"],
  "copyInfoWithContext.maskingAllowList": ["EmployeeID", "Department"]
}
```

**Expected Result:** Emails and phones masked, EmployeeID and Department visible.

---

### 4. **customer-data.json** - JSON Configuration
Contains customer data in JSON format for testing pattern-based masking.

**Sensitive Data Included:**
- ✅ Customer IDs
- ✅ Email addresses
- ✅ Phone numbers
- ✅ Physical addresses
- ✅ BSB codes
- ✅ Bank account numbers
- ✅ Credit cards
- ✅ TFN and ABN

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Expected Result:** All detected patterns masked throughout the JSON structure.

---

### 5. **customer-data.xml** - XML Data
Same customer data in XML format for testing XML masking.

**Sensitive Data Included:** (Same as JSON file)

**Expected Result:** Text content within XML tags gets masked, preserving structure.

---

### 6. **config.js** - JavaScript Configuration
Contains application config with embedded sensitive data.

**Sensitive Data Included:**
- ✅ IP addresses
- ✅ Email addresses
- ✅ API keys
- ✅ Credit card numbers
- ✅ Phone numbers
- ✅ Customer IDs
- ✅ Banking details (BSB, account numbers)
- ✅ TFN, ABN, Medicare

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "structural"
}
```

**Expected Result:** All sensitive strings masked while maintaining code structure.

---

### 7. **settings.py** - Python Configuration
Django settings file with various sensitive configurations.

**Sensitive Data Included:**
- ✅ Database credentials
- ✅ Email addresses
- ✅ API keys (Stripe, SendGrid)
- ✅ Phone numbers
- ✅ SSN (US format)
- ✅ IP addresses
- ✅ Australian tax numbers (TFN, ABN)
- ✅ Medicare numbers
- ✅ Credit cards

**Recommended Settings:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.includeMaskingStats": true
}
```

**Expected Result:** All PII masked with statistics shown at the bottom.

---

## 🧪 How to Test

### Step 1: Enable Data Masking
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Copy Info with Context"
3. Enable: `Enable Data Masking` ✅
4. Choose a preset or configure manually

### Step 2: Open a Test File
Open any of the test files above in VS Code.

### Step 3: Select Text
Select some text containing sensitive data (or select entire file).

### Step 4: Copy with Context
Press `Ctrl+Alt+C` (Windows/Linux) or `Cmd+Alt+C` (Mac)

### Step 5: Check Results
1. **Status Bar**: Look for the shield icon showing how many items were masked
2. **Notification**: A popup will show what was masked (e.g., "Copied with 5 items masked: 3 emails, 2 phones")
3. **Clipboard**: Paste the result and verify sensitive data is masked

---

## 📊 Test Scenarios

### Scenario 1: CSV Column-Aware Masking
**File:** `financial-data.csv`

**Test:**
1. Select rows 2-4 (multiple customers)
2. Enable `financial` preset
3. Copy selection

**Expected Output:**
```csv
EmailAddress,BSB,AccountNumber,ClientNumber,TFN,Phone,CreditCard,Status
j***@e***.com,***-*56,***321,C***5,*** *** ***,+61 *** ** **8,**** **** **** 9010,Active
j***@c***.com,***-*12,***456,C***0,*** *** ***,0*** *** ***,**** **** **** 9903,Active
```

### Scenario 2: Pattern-Based Masking (JSON)
**File:** `customer-data.json`

**Test:**
1. Select a customer object
2. Enable `financial` preset with `partial` strategy
3. Copy selection

**Expected Output:**
```json
{
  "id": "C***5",
  "name": "John Anderson",
  "email": "j***@e***.com",
  "phone": "+61 *** ** **8",
  "address": "[ADDRESS REDACTED]",
  "banking": {
    "bsb": "***-*56",
    "accountNumber": "***321",
    "creditCard": "**** **** **** 9010"
  }
}
```

### Scenario 3: Custom Deny List
**File:** `enterprise-data.csv`

**Test:**
1. Configure deny list: `["Email", "CompanyEmail"]`
2. Configure allow list: `["EmployeeID"]`
3. Select data and copy

**Expected Output:**
Only Email and CompanyEmail columns masked, EmployeeID visible.

### Scenario 4: Masking Statistics
**File:** `settings.py`

**Test:**
1. Enable `includeMaskingStats: true`
2. Select entire file
3. Copy

**Expected Output:**
Bottom of output shows:
```python
# Data masked: 8 emails, 4 phones, 3 credit_cards, 2 australian_bsbs, 2 australian_tfns
```

---

## 🎯 Masking Strategy Comparison

Test the same selection with different strategies:

### Partial (Default)
```
Email: j***@e***.com
Phone: +61 *** ** **8
BSB: ***-*56
Credit Card: **** **** **** 9010
```

### Full
```
Email: ***
Phone: ***
BSB: ***
Credit Card: ***
```

### Structural
```
Email: ****@*******.com
Phone: +61 *** *** ***
BSB: ***-***
Credit Card: **** **** **** ****
```

---

## 🔧 Custom Pattern Testing

Add a custom pattern to test company-specific identifiers:

```json
{
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "Employee ID",
      "pattern": "EMP\\d{6}",
      "replacement": "EMP######",
      "enabled": true
    },
    {
      "name": "Customer ID",
      "pattern": "CUST-\\d{8}",
      "replacement": "CUST-########",
      "enabled": true
    }
  ]
}
```

Test with `enterprise-data.csv` - Employee IDs should be masked.

---

## 🎓 Learning Exercise

Try these challenges:

1. **Challenge 1**: Mask only emails and phones, keep everything else
2. **Challenge 2**: Use `healthcare` preset on financial data - see what gets masked
3. **Challenge 3**: Create a custom pattern for your own company's ID format
4. **Challenge 4**: Test masking on a 100+ row CSV file (performance test)
5. **Challenge 5**: Mix masking with different CSV output modes (minimal, smart, table, detailed)

---

## 📝 Notes

- **Default Behavior**: Masking is **disabled by default** (opt-in for safety)
- **Performance**: Masking adds minimal overhead (<50ms for typical selections)
- **Column Detection**: CSV masking is case-insensitive and fuzzy-matches column names
- **Pattern Priority**: Custom patterns > Deny list > Built-in patterns > Allow list
- **Preset Flexibility**: You can combine presets with custom deny/allow lists

---

## 🐛 Troubleshooting

**Problem**: Masking not working
- ✅ Check `enableDataMasking` is set to `true`
- ✅ Verify preset is not set to `none`
- ✅ Check if column is in the allow list

**Problem**: Too much is being masked
- ✅ Switch to `basic` preset instead of `enterprise`
- ✅ Add columns to allow list
- ✅ Use `manual` mode instead of `auto`

**Problem**: Not enough is being masked
- ✅ Add specific columns to deny list
- ✅ Switch to `strict` mode
- ✅ Use `enterprise` preset
- ✅ Add custom patterns for company-specific data

---

Happy testing! 🎉
