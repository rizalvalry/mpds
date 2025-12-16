# Backend Fix Required: Bulk Validate Endpoint

## Issue
The bulk validate endpoint `/case/bulk_update` is rejecting Status ID 3 with error:
```
Status ID 3 is not a valid validation status. Expected either Correct or False Detection.
```

## Current Backend Behavior (INCORRECT)

**File:** `BulkUpdateCommandHandler.cs` (lines 29-37)

```csharp
if (!CaseStatusConstants.IsValidationStatus(request.StatusId.Value))
{
    return new BulkUpdateDto
    {
        Success = false,
        Message = $"Status ID {request.StatusId.Value} is not a valid validation status. " +
                  $"Expected either {CaseStatusConstants.ValidationTrueDetection} or " +
                  $"{CaseStatusConstants.ValidationFalseDetection}.",
        UpdatedCount = 0
    };
}
```

**File:** `CaseStatusConstants.cs`

```csharp
public static bool IsValidationStatus(int statusId)
{
    // ONLY accepts 4 or 5!
    return statusId == TrueDetection || statusId == FalseDetection;
}
```

## Required Fix

### Option 1: Allow Status ID 3 for Bulk Validate (Recommended)

Modify `CaseStatusConstants.cs`:

```csharp
public static class CaseStatusConstants
{
    public const int NotStarted = 1;
    public const int InProgress = 2;
    public const int Validated = 3;           // ADD THIS
    public const int TrueDetection = 4;
    public const int FalseDetection = 5;

    public static bool IsValidationStatus(int statusId)
    {
        // Accept 3 (In Progress/Validated), 4 (Correct), or 5 (False)
        return statusId == Validated ||
               statusId == TrueDetection ||
               statusId == FalseDetection;
    }
}
```

### Option 2: Remove Validation Entirely

If bulk_update should accept ANY status ID, remove the validation check:

```csharp
public async Task<BulkUpdateDto> Handle(BulkUpdateCommand request, CancellationToken cancellationToken)
{
    try
    {
        int updatedCount = 0;

        // Bulk Validate: AssignTo, AreaCode, StatusId
        if (request.StatusId.HasValue)
        {
            // REMOVE THIS VALIDATION CHECK:
            // if (!CaseStatusConstants.IsValidationStatus(request.StatusId.Value))
            // {
            //     return error...
            // }

            // Directly update cases
            updatedCount = await _caseRepository.BulkValidate(
                request.AssignTo,
                request.StatusId.Value,
                cancellationToken,
                request.AreaCode);

            return new BulkUpdateDto
            {
                Success = true,
                Message = $"Successfully updated {updatedCount} cases to status ID {request.StatusId.Value}",
                UpdatedCount = updatedCount
            };
        }
        // ... rest of code
    }
}
```

## Frontend Request

Frontend is sending:
```json
{
    "assignTo": 15,
    "areaCode": "K,L",
    "statusId": 3
}
```

**Expected:** Update cases assigned to worker 15 in areas K and L to status ID 3 (In Progress/Validated)

**Current Result:** Error - "Status ID 3 is not a valid validation status"

## Database Status ID Mapping

| ID | Name | Purpose | Should be allowed in bulk_update? |
|---|---|---|---|
| 1 | Not Started | Initial state | Maybe |
| 2 | In Progress | Worker is working on it | Yes |
| 3 | **Validated** | **Worker has validated the case** | **YES (Required!)** |
| 4 | Correct/True Detection | Confirmed as bird drop | Yes |
| 5 | False Detection | Not a bird drop | Yes |

## Repository Query

**File:** `CaseRepository.cs` `BulkValidate()` method

The repository query only filters by `status_id = 2` (In Progress):

```sql
WHERE c.assign_to = @assignTo
AND c.status_id = @inprogressStatusId  -- Must be 2 (In Progress)
```

**Question:** Should this also accept cases with status_id = 3?

If Status ID 3 is "Validated", and you want to allow re-validation, you might need to update the WHERE clause:

```sql
WHERE c.assign_to = @assignTo
AND c.status_id IN (2, 3)  -- Accept both In Progress and Validated
```

## Recommendation

**Use Option 1:** Add Status ID 3 to the validation whitelist.

This allows:
- Bulk Validate to set cases to "Validated" (ID: 3)
- Bulk Area Confirm to set cases to "Correct" (ID: 4) or "False Detection" (ID: 5)

Both operations remain distinct and clear in purpose.

## Testing

After fixing, test with:

```bash
curl --location 'https://droneark.bsi.co.id/api/cases/case/bulk_update' \
--header 'Content-Type: application/json' \
--data '{
    "assignTo": 15,
    "areaCode": "K,L",
    "statusId": 3
}'
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Successfully updated X cases to status ID 3",
    "updatedCount": X
}
```

## Frontend Code (No changes needed)

**File:** `BulkValidateDialog.js` (line 40)

```javascript
// statusId = 3 untuk Bulk Validate (In Progress)
await onBulkValidate(selectedWorker, selectedAreas, 3);
```

Frontend is correctly sending Status ID 3 and expects backend to accept it.

---

**Status:** ⏳ Waiting for backend fix

**Priority:** High - Blocking Bulk Validate feature

**Assigned to:** Backend Developer
