Remove the Stripe Payout Status column from the admin listings table.

- File: `src/routes/_admin/admin.listings.tsx`.
- Remove the `<th>Stripe Payout Status</th>` header cell.
- Remove the `<td>` body cell that renders the connected/missing Stripe status pill.
- Update both empty/loading state `colSpan={9}` values to `colSpan={8}` to match the new column count.

No database or other UI changes are needed.