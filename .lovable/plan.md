### Tooltip text color fix

The vessel tooltip in `OperatorCard` currently shows the capacity line in `text-muted-foreground`, which makes it hard to read against the tooltip background. Both the boat type and the capacity line should be the same bright white color.

### Change

In `src/components/listings/OperatorCard.tsx`, update the `TooltipContent`:

- Remove the per-line styling overrides and let both lines render as bright white (`text-white`).
- Keep the boat type line bold and the capacity line smaller.

Current tooltip content:

```tsx
<TooltipContent side="top" className="text-center">
  <div className="font-semibold">{fullVesselLabel}</div>
  {capacity != null && (
    <div className="text-xs text-muted-foreground">
      Up to {capacity} Angler{capacity === 1 ? "" : "s"}
    </div>
  )}
</TooltipContent>
```

Updated:

```tsx
<TooltipContent side="top" className="text-center text-white">
  <div className="font-semibold">{fullVesselLabel}</div>
  {capacity != null && (
    <div className="text-xs">
      Up to {capacity} Angler{capacity === 1 ? "" : "s"}
    </div>
  )}
</TooltipContent>
```

### Verification

- Hover the vessel pill on a charter card and confirm both lines are bright white and readable.
- Confirm no other visual changes to the card or its hover behavior.
