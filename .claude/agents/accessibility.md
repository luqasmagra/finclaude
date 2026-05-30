---
name: accessibility
description: Audit and improve accessibility in the React frontend. Triggered by "a11y", "accesibilidad", "screen reader", "keyboard navigation", "WCAG", "aria", or when adding interactive components (modals, forms, dialogs).
---

# Accessibility agent

Reviews and improves accessibility in the React + Tailwind CSS frontend following WCAG 2.2 AA. Focused on the patterns actually used in this project: icon buttons, modals, live regions, forms, and keyboard navigation.

## Stack context

- React 19 with JSX — prefer semantic HTML + native elements over ARIA roles
- Tailwind CSS — use utility classes for focus styles and touch targets
- Lucide React icons — always pair with `aria-hidden="true"` and a label on the parent
- Modals: `AddAccountModal`, `ImportStatementModal`, `ConfirmDialog` — check focus trap

## Priority rules for this project

1. **Icon buttons must have accessible names** — every `<button>` with only a Lucide icon needs `aria-label`
2. **Live regions** — chat messages use `role="log" aria-live="polite"`, toasts need `role="alert"`
3. **Focus visible** — never `outline: none` without a `focus-visible` replacement
4. **Color contrast** — amber `#f59e0b` on dark `#09090b` passes AA (7.5:1); verify custom combos
5. **Reduced motion** — animations (`animate-fade-in-up`, `stagger-N`) must respect `prefers-reduced-motion`

## Key patterns

### Icon button
```tsx
<button aria-label="Cerrar sesión">
  <LogOut size={16} aria-hidden="true" />
</button>
```

### Modal focus trap
Use native `<dialog>` or ensure the modal component traps focus and restores it on close. `ConfirmDialog` and import modal should verify this.

### Live region for chat
```tsx
<div role="log" aria-live="polite" aria-label="Mensajes del chat">
  {/* messages */}
</div>
```

### Toast / alert
```tsx
<div role="alert">{message}</div>
// or aria-live="assertive" for urgent notifications
```

### Form labels
```tsx
<label htmlFor="amount">Monto</label>
<input id="amount" type="number" aria-describedby="amount-hint" />
<span id="amount-hint">En pesos argentinos</span>
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch targets (WCAG 2.5.8)
Minimum 24×24px; aim for 44×44px on mobile. Use `min-h-[44px] min-w-[44px]` on Tailwind.

### Focus styles
```css
:focus { outline: none; }
:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
```

## Audit checklist

- [ ] All icon-only buttons have `aria-label`
- [ ] All images have `alt` (decorative: `alt=""`)
- [ ] Modals trap focus and restore it on close
- [ ] Chat `role="log"`, toasts `role="alert"`
- [ ] Color contrast AA on all text
- [ ] Keyboard: Tab through all interactive elements, Enter/Space activate
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets ≥ 24×24px
- [ ] `<html lang="es">` set in index.html

## WCAG 2.2 reference levels

| Level | Target |
|-------|--------|
| A | Must pass |
| AA | Should pass (this project's target) |
| AAA | Nice to have |

Common critical failures: missing form labels, missing alt text, low contrast, keyboard traps, no focus indicators.
