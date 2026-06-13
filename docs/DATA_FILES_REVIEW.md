# Data Files Review: Excel & JSON Alignment with Backend Architecture

> Analysis of 3 Excel files and 2 JSON files in `mobile-app/` against the Prisma schema and `seed.ts` processing logic.
> All data files were cross-referenced by an automated analysis script.

---

## Files Reviewed

| File | Type | Size |
|------|------|------|
| `hierarchy_output.json` | JSON — org hierarchy | 303 lines |
| `branch_lc_team.json` | JSON — branch-to-LC mapping | 3,834 lines |
| `AC and UPS FY 26-27 - Facilites Apps.xlsx` | Excel — UPS AMC data | 194 rows |
| `HVAC AMC Data FY 26-27 Facilities Team.xlsx` | Excel — HVAC/AC data | 871 rows |
| `INVERTER FY 26-27 facility Team.xlsx` | Excel — Inverter + UPS data | 94 rows (SW3) + 1 row (Sheet1) |

---

## 1. JSON Structural Analysis

### 1.1 Overview — Both JSON files are structurally aligned

- `hierarchy_output.json` has **1 RM**, **6 BAMs**, **189 branches** — exactly matching the claimed `total_branches: 189`
- `branch_lc_team.json` also has **189 branches** across the same 6 BAMs
- **Zero branch mismatches** — every branch in hierarchy has a corresponding entry in branch_lc_team and vice versa
- **BAM-level match**: All 6 BAMs have identical branch lists in both files

### 1.2 Issue: `branch_lc_team.json` Contains Roles Unknown to the Backend

Two roles found that have **no mapping** in the backend's `RoleId` enum:

| Role | Occurrences | Backend Mapping |
|------|-------------|-----------------|
| `Admin Manager` | 5 branches (all under BAM Pachari Teja) | **None** — `seed.ts` will skip these users |
| `Admin` | Some team entries | **None** |

**Impact**: These team members will not be created during seeding because the seed script only processes roles `lc`, `branchManager`, and `rm`. The `Admin Manager` role appears in branches like "Guntur Additional", "Vijayawada Additional 1st Floor", "Vijayawada CSB", "Vijayawada GH 1", "Vijayawada GH 2". These individuals (`Subash Manikanta`, `Edenaga Kanaka Siva Sai`, `Ravi Kumar N`, `Sandhya Rani`) are omitted entirely.

**Fix**: Either add `Admin Manager` as a role variant to the backend schema, or map it to `branchManager` in the seed script.

### 1.3 Issue: BAM Assigned as LC for "Kakinada Additional"

```json
"Kakinada Additional": {
  "lc": "Nikhil Joshi",
  "team": [ { "name": "Nikhil Joshi", "role": "Branch Admin Manager (BAM)" } ]
}
```

**Nikhil Joshi** is a BAM but listed as the LC for "Kakinada Additional". The seed script will create a **second user** with name "Nikhil Joshi" but role `lc` and a different email (`nikhiljoshi@gmail.com`). This creates:
1. **Duplicate name** in the system (confusing for UI/UX)
2. **No cross-reference** between his BAM identity and LC identity
3. **Email collision risk**: if the name normalization produces the same email as the existing BAM user, the seed crashes

**Fix**: Either assign a proper LC to this branch, or handle the dual-role case in the seed script.

---

## 2. Excel File Structural Issues

### 2.1 Missing Critical Columns Across Sheets

| Column | UPS AMC (AC file) | HVAC Sheet1 | Inverter SW3 | Inverter Sheet1 |
|--------|-------------------|-------------|--------------|-----------------|
| Serial Number | ❌ | ❌ | ✅ (93 unique) | ✅ (1 unique) |
| Model Number | ✅ | ❌ | ✅ | ✅ |
| Make/OEM | ✅ | ✅ | ✅ | ✅ |
| Location | ✅ | ✅ | ✅ | ✅ |
| Address | ✅ | ✅ | ❌ | ❌ |
| Installation Date | ✅ | ✅ | ✅ | ❌ |
| Warranty | ✅ | ✅ | ❌ | ❌ |
| AMC Vendor | ✅ | ✅ | ✅ | ❌ |

**Impact on `seed.ts`**:

The seed script uses column index detection via keyword matching:

```typescript
const idxSerial = getColIndex(["serial number", "serial"]);
```

For the **UPS AMC Details** sheet (AC file) and **HVAC Sheet1**, `idxSerial` returns `-1`. The seed script then falls back to generating mock serials:
```typescript
const serial = idxSerial !== -1 && row[idxSerial] ? String(row[idxSerial]).trim() : `SN-MOCK-${applianceCount}`;
```

This means **871 HVAC appliances** and **194 UPS appliances** will get fake serial numbers like `SN-MOCK-1`, `SN-MOCK-2`, etc. These:
- Are **meaningless** for real-world asset tracking
- Can **collide** if the seed is re-run with a different batch order
- Lose the **audit trail** between the Excel source data and DB records

### 2.2 Location Name Mismatches Between Excel and Hierarchy

| Excel File | Unmatched Locations | Issue |
|------------|-------------------|-------|
| AC/UPS File | `"Padderu"` | Should be `"Paderu"` (missing 'r') |
| AC/UPS File | `"Govindpur"` | Should be `"Gobindpur"` (spelling variation) |
| Inverter SW3 | `"Amravati"` | Should be `"Amaravati"` (extra 'r') |
| Inverter SW3 | `"Ganavaravam"` | Should be `"Gannavaram"` (transposed letters + spelling error) |
| Inverter SW3 | `"S.Kota"` | Should be `"S Kota"` (dot vs space) |

**Impact**: These 5 appliances will **not be assigned** to any branch during seeding. The `findBestBranch` function's fuzzy matching (first-5-chars prefix) partially mitigates this:
- `"Padderu"` vs `"Paderu"` → first 5 chars: `padde` vs `pader` → **NO MATCH** → branch is skipped entirely
- `"Govindpur"` vs `"Gobindpur"` → first 5 chars: `govin` vs `gobin` → **NO MATCH** → appliance silently dropped
- `"Amravati"` vs `"Amaravati"` → first 5 chars: `amrav` vs `amarav` → **NO MATCH**
- `"Ganavaravam"` vs `"Gannavaram"` → first 5 chars: `ganav` vs `ganna` → **NO MATCH**
- `"S.Kota"` vs `"S Kota"` → first 5 chars: `s.ko` vs `s ko` → **NO MATCH**

**5 appliances silently dropped from the seed.**

### 2.3 Clean Name Collisions Cause False Positive Matches

The seed's `cleanLocationName` function strips suffixes like "Additional", "- Additional", "CSB", "RTC", "AF", "GH 1", "GH 2". This causes **15 branch name collisions** where different branches normalize to the same value:

| Clean Name | Original Branches | Match Type |
|------------|------------------|------------|
| `raigarh` | Raigarh, Raigarh - Additional | **Ambiguous** |
| `eluru` | Eluru, Eluru Additional | **Ambiguous** |
| `kakinada` | Kakinada, Kakinada Additional, Kakinada Additional 4Th Floor | **Ambiguous** |
| `rajahmundry` | Rajahmundry, Rajahmundry Additional | **Ambiguous** |
| `visakhapatnam` | Visakhapatnam, Visakhapatnam Addtiional Ground Floor, Visakhapatnam CSB | **Ambiguous** |
| `guntur` | Guntur, Guntur Additional | **Ambiguous** |
| `vijayawada` | Vijayawada AF, Vijayawada CSB, Vijayawada GH 1, Vijayawada GH 2, Vijayawada Rtc (5!) | **Ambiguous** |
| `kadapa` | Kadapa, Kadapa Additional | **Ambiguous** |
| `madanapalle` | Madanapalle, Madanapalle Additional | **Ambiguous** |
| `nellore` | Nellore, Nellore Additional | **Ambiguous** |
| `bhilai` | Bhilai, Bhilai Additional | **Ambiguous** |
| `raipur` | Raipur, Raipur Additional | **Ambiguous** |
| `bokaro` | Bokaro, Bokaro Additional | **Ambiguous** |
| `ranchi` | Ranchi, Ranchi - Additional | **Ambiguous** |

**How the seed resolves this**: `findBestBranch` iterates the branch list and returns the **first** match (exact, then prefix, then first-5-chars). For the "UPS AMC Details" sheet, if the Excel says `"Raigarh"`:
1. `cleanLocationName("Raigarh")` → `"raigarh"`
2. Cleaned DB name for `"Raigarh"` → `"raigarh"` → **exact match** → returns Raigarh ✅
3. Cleaned DB name for `"Raigarh - Additional"` → `"raigarh"` → also an exact match, but never reached

If the Excel says `"Raigarh Additional"`:
1. `cleanLocationName("Raigarh Additional")` → `"raigarh"` (strips "additional")
2. Now both "Raigarh" and "Raigarh - Additional" are exact matches
3. **Returns "Raigarh" (first in list)** regardless of which was intended

**Impact**: Appliances for "Raigarh - Additional" may be incorrectly assigned to the main "Raigarh" branch, depending on the Excel location value and iteration order. Same for all 15 collision groups.

### 2.4 Inverter Sheet1 (Sheet1 in Inverter File) Has Only 1 Row

The seed script maps `INVERTER FY 26-27 facility Team.xlsx / Sheet1` to category `UPS`:
```typescript
{ name: "INVERTER FY 26-27 facility Team.xlsx", sheet: "Sheet1", category: "UPS" }
```

This sheet has only **1 data row** (Narasaraopet). The mapping to `UPS` category seems incorrect — Sheet1 in the Inverter file likely contains Inverter data, not UPS data. This is a **category misclassification**.

Actual content of Sheet1:
```
Equipment: "INVERTER"
Make: "MICROTEK"
Capacity: "2KVA"
Model: "1000E"
Serial: "12345"
Location: "Narasaraopet"
```

The `Equipment` column explicitly says "INVERTER", but the seed maps it to `category: "UPS"`. This misclassifies 1 appliance.

### 2.5 HVAC File Has No Serial or Model Number Columns

The HVAC file (871 rows) is missing:
- **Serial number column** — all 871 AC units get mock serials
- **Model number column** — all 871 AC units get `model: "MOD-MOCK"`

Without serial numbers, there's no way to:
- Deduplicate appliances (the `upsert` uses `serial` as the unique key)
- Track specific units across service events
- Cross-reference with physical asset tags

### 2.6 Duplicate UPS entries across files

The `AC and UPS FY 26-27 - Facilites Apps.xlsx` (UPS AMC sheet) and `INVERTER FY 26-27 facility Team.xlsx` (SW3 sheet) both contain UPS data. Locations overlap:
- UPS AMC sheet covers Chhattisgarh branches (Ambikapur, Bilaspur, etc.)
- Inverter SW3 covers Andhra Pradesh branches (Amalapuram, Bhimavaram, etc.)

The seed processes both files independently and uses `serial` for dedup. Since the UPS AMC file has no serials (all `SN-MOCK-N`), and the Inverter SW3 file DOES have real serials, there's no overlap. But the mock serials from the UPS AMC sheet could collide with future imports.

---

## 3. Backend Schema Mismatches

### 3.1 Appliance Model Fields vs Excel Columns

| Prisma Field | AC/UPS File | HVAC File | Inverter SW3 | Status |
|-------------|-------------|-----------|--------------|--------|
| `name` | Asset Description | Asset Description | Asset Description | ✅ Always present |
| `category` | Hardcoded "UPS" | Hardcoded "AC" | Hardcoded "Inverter" | ✅ |
| `zone` | ❌ Not in file | ❌ Not in file | ❌ Not in file | Defaults to "Branch premises" |
| `brand` | Make (OEM) | Make (OEM) | Make (OEM) | ✅ |
| `model` | Model Number | ❌ Missing | Model Number | ❌ HVAC fails |
| `serial` | ❌ Missing | ❌ Missing | Serial Number | ❌ AC + UPS fail |
| `purchaseDate` | Installation date | Installation Date | Installation Date | ✅ |
| `nextService` | Warranty Expiry | Warranty End Date | ❌ Missing | ⚠️ Inconsistent |
| `amcVendor` | AMC Vendor 26-27 | AMC Vendor 26-27 | Service Provideder | ✅ |
| `purchaseCost` | ❌ Not in any file | ❌ Not in any file | ❌ Not in any file | Defaults to 0 |
| `healthScore` | ❌ Not available | ❌ Not available | ❌ Not available | Random 80-100 |
| `status` | ❌ Not available | ❌ Not available | ❌ Not available | Always Operational |

### 3.2 Branch Model Fields vs Excel Data

The seed attempts to update `Branch.address` and `Branch.city` from the Excel address/state columns:

```typescript
if (address || stateVal) {
  await prisma.branch.update({
    data: { address: address || undefined, city: stateVal || undefined }
  });
}
```

**Problem**: This runs for **every appliance row** belonging to a branch. If a branch has 20 AC units, the branch's address is updated 20 times (last one wins). This is:
- Wasteful (19 unnecessary DB writes per branch)
- Non-deterministic (depends on Excel row ordering)
- Risk of overwriting a real address with a null/empty one

### 3.3 No Excel Column Maps to `Branch.geoRadius`, `shiftWindow`, `monthlyBudget`, etc.

These fields are all set to defaults during seeding and never updated from the data files. The branch model has 30+ fields but only 3 (`address`, `city`, `name`) are populated from the Excel files.

---

## 4. Data Quality Issues in the JSON Files

### 4.1 Typo: "Addtiional" Instead of "Additional"

In `hierarchy_output.json`:
```
"Visakhapatnam Addtiional Ground Floor"
```

And in `branch_lc_team.json`:
```
"Visakhapatnam Addtiional Ground Floor"
```

The misspelling `"Addtiional"` (extra 'i') is consistent across both files, so matching works. But it's inconsistent with every other "Additional" suffix and looks unprofessional in the UI.

### 4.2 Trailing Space in "Ranchi - Additional "

In both files: `"Ranchi - Additional "` has a trailing space after "Additional". The `cleanLocationName` function handles this via `.trim()`, but raw branch names in the DB will have the trailing space.

### 4.3 Inconsistent LC Name Formatting

In `branch_lc_team.json`, LC names have inconsistent formatting:
- `"Shital Devnath1"` — suffix "1" (possibly a duplicate marker)
- `"Virendra Patel1"` — suffix "1"
- `"Pradeep Sahu2"` — suffix "2"
- `"chintaluri Naga Kanaka Surya  Ranga sai ganesh "` — lowercase start, double spaces, trailing space
- `"Uppala.Suresh"` — dot separator instead of space
- `"PULIKANTI  SURESH"` — ALL CAPS, double space
- `"Bandi Suresh "` — trailing space
- `"Dara  nagaraju"` — double space, lowercase
- `"Khuresh Ahmed  Basha Shaik"` — double space in middle

**Impact**: The seed script uses `name.toLowerCase().replace(/\s+/g, "") + "@gmail.com"` to generate emails, so:
- Normalization handles double spaces (replaces with empty)
- But trailing spaces and dots create emails like `uppala.suresh@gmail.com` vs `uppalasuresh@gmail.com` (dots are valid in email local parts, so `Uppala.Suresh` and `Uppala Suresh` would get different emails)
- The "1" and "2" suffixes in names like "Shital Devnath1" create emails `shitaldevnath1@gmail.com` — these are development artifacts that should not be in production data

### 4.4 Missing LC Coverage: 38 Branches Have No LC

| BAM | Branches Without LC |
|-----|-------------------|
| Ishwar Rajput | Bilaspur, Raigarh, Raigarh - Additional (3) |
| Nikhil Joshi | Kakinada, Kakinada Additional 4Th Floor, Rajahmundry, Rajahmundry Additional, Visakhapatnam, Visakhapatnam CSB, Visakhapatnam Addtiional Ground Floor, Vizag Slpl, Eluru (9) |
| Pachari Teja | Guntur Additional, Kurnool, Vijayawada Additional 1St Floor, Vijayawada Additional 2Nd Floor, Vijayawada Additional 5Th Floor, Vijayawada CSB, Vijayawada GH 1, Vijayawada GH 2, Vijayawada Rtc (9) |
| Pandla Munirathnam | Anantapur, Nellore, Nellore Additional, Ongole, Ongole Additioal, Kavali, Kandakur, Sullurpeta, Railway Koduru, Tirupati 1st Floor, Tirupati 2nd Floor, Venkatagiri, Srikalahasti, Rayadurg, Tadipatri (15) |
| Ranjana Gupta | Bijapur CH, Deobhog (2) |
| Sumit Singh | (0 — all 47 have LCs) |

**38 branches (20%) have no LC**. The seed creates branches for all of them but:
- `cron.controller.ts` uses `app.branch.users[0]` to find an LC — returns null for these branches
- `attendance.controller.ts` requires LC to have `branchId` — auto-generated tasks fail
- These branches have no local operator to mark attendance, complete tasks, or report issues

> **📌 Design Instruction**: For any branch that has **no dedicated LC**, the **Admin Assistant (AA)** assigned to that branch (via `branch_lc_team.json` team listing) is the de facto local operator. In this model, the AA handles ALL branch-level operations — attendance, task completion, complaint reporting — effectively functioning as the LC for that location. The seed script should detect branches without an LC and automatically promote the first AA in the team to act as the LC role for that branch, assigning them `role: lc` and linking their `branchId` accordingly. This ensures 100% branch coverage for daily operations. The 38 branches listed above all have an AA assigned who should be elevated to LC responsibilities in the seed.

---

## 5. Summary of Issues

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| 1 | 🔴 **Critical** | 871 HVAC + 194 UPS appliances get **mock serial numbers** (no serial column in source) | Cannot deduplicate, track, or audit real assets |
| 2 | 🔴 **Critical** | 5 Excel locations don't match any branch name (Padderu, Govindpur, Amravati, Ganavaravam, S.Kota) | 5+ appliances silently dropped from seed |
| 3 | 🔴 **Critical** | `cleanLocationName` creates **15 ambiguous branch name collisions** (Raigarh/Raigarh-Additional, etc.) | Appliances assigned to wrong branch non-deterministically |
| 4 | 🟠 **High** | 38 branches (20%) have **no LC assigned** | AA should auto-promote to LC per design instruction, but seed doesn't handle this |
| 5 | 🟠 **High** | "Kakinada Additional" lists **BAM Nikhil Joshi as LC** | Duplicate user created, email collision risk |
| 6 | 🟠 **High** | `Admin Manager` role found in data but **unknown to backend** | 5 team members not created during seeding |
| 7 | 🟠 **High** | "Sheet1" in Inverter file mapped to **UPS category** but contains Inverter data | Category misclassification |
| 8 | 🟡 **Medium** | 871 HVAC units have **no model number** (column missing) | All default to `"MOD-MOCK"` |
| 9 | 🟡 **Medium** | Branch address updated **once per appliance row** (wasteful + non-deterministic) | 19 redundant writes per branch |
| 10 | 🟡 **Medium** | Inconsistent LC name formatting (number suffixes, dots, double spaces, mixed case) | Unpredictable email generation |
| 11 | 🔵 **Low** | "Addtiional" typo (extra 'i') in Visakhapathem branch name | Cosmetic |
| 12 | 🔵 **Low** | Trailing space in "Ranchi - Additional " | Cosmetic but propagates to DB |

---

## 6. Recommended Fixes

### Immediate (Seed Correctness)
1. **Add serial number columns** to the AC and UPS Excel files before seeding, OR use `Asset Code` as serial fallback (HVAC file has `Asset Code` column at index 4)
2. **Fix the 5 misspelled Excel location names** to match hierarchy branch names
3. **Fix `cleanLocationName` to handle collisions** — don't strip "Additional", "CSB", "RTC", "AF", "GH" suffixes; instead use the full raw name for matching
4. **Assign LCs to the 38 uncovered branches** or mark them explicitly as "unstaffed" in the backend

### Short-term (Code Fixes in seed.ts)
5. **Avoid redundant branch address updates** — update once per unique branch, not once per appliance row
6. **Fix Sheet1 category** — detect category from the `Equipment` column instead of hardcoding
7. **Handle `Admin Manager` role** — map to `branchManager` or add to `RoleId` enum
8. **Normalize LC names** before creating users (trim, deduplicate spaces, remove trailing number suffixes)

### Long-term (Process)
9. **Add data validation** for Excel files before import (column presence checks, location name verification)
10. **Add a mismatch report** to seed output showing how many appliances per file were matched/unmatched
