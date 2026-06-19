## Update Captain "View Receipt" modal

File: `src/components/earnings/TripReceiptDialog.tsx`

The receipt already pulls real per-order data from `TripBookingSummary` (`total_price_minor`, `deposit_minor`, `balance_due_minor`) — no dummy/random data is in use. Changes are presentational so the math reads clearly and labels match the pay-at-meeting model.

### Financial Summary section
Render exactly this three-line breakdown for the selected order:

1. `Total Trip Price` → `total_price_minor`
2. `LESS: Fishtrippers Deposit` → `−deposit_minor` (relabeled from "Deposit Collected Online")
3. `Balance to Collect at Meeting` → `balance_due_minor`, bold, highlighted row (relabeled from "Balance Due at Dock"). This value is identical to the "Money Earned" column in the earnings table.

Keep currency formatting via `formatCurrency(value / 100, currency)`.

### Footer note
Replace the existing note under the breakdown with:

> Payment is collected directly from the angler in person at the time of the meeting.

### Print button
Rename the existing button label to **"Print Receipt"** (keep `window.print()` handler and the `#receipt-printable` print styles already defined in `src/styles.css`, which hide everything else and print only the receipt card).

### Out of scope
No changes to server functions, schema, earnings page, or other receipt dialogs.
