## Plan

1. **Fix card currency reactivity**
   - Update the operator card price display so it subscribes directly to the selected currency and recalculates when the dropdown currency changes.
   - Keep the existing suffix logic intact: `/ angler`, `/ private group`, `/ entire boat`.

2. **Remove stale server-side price formatting from cards**
   - Ensure search/featured card data returns raw price amount + source currency only, not a preformatted dollar label.
   - This prevents cached server data from locking cards to USD.

3. **Verify the affected flows**
   - Check homepage Featured Charters & Guides cards.
   - Check Search results cards.
   - Confirm listing-page trip prices and booking/checkout prices still follow the selected currency and are not regressed.