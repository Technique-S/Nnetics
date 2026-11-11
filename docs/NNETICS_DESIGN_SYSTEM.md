# Nnetics design system

Emerald Precision uses warm paper surfaces, forest navigation and a focused emerald for primary actions. The same visual language covers entry, the owner workspace and the contractor portal. The Nnetics monogram keeps its original letter and dot.

## Color and depth

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#F6F3EC` | `#0D1A15` |
| Surface | `#FFFDF8` | `#14241C` |
| Raised surface | `#EFEFE6` | `#1C2F25` |
| Primary text | `#13261E` | `#EEF4EC` |
| Secondary text | `#4D6156` | `#B1C3B7` |
| Primary action | `#087453` | `#63C9A2` |
| Primary action text | `#FFFFFF` | `#0A261B` |
| Control boundary | `#748578` | `#658574` |
| Focus | Primary action | Primary action |
| Forest feature surface | `#112D23` | `#112D23` |
| Sage on forest | `#D7E8D9` | `#D7E8D9` |
| Sand accent | `#D9C4A6` | `#E3C799` |

`apps/owner/src/app/tokens.css` defines text, selection, controls, warning, success, danger and informational pairs. Use the foreground and background from the same semantic pair. Status labels communicate the outcome in words. Panel borders mark adjacent content. Shadows primarily distinguish overlays from the page.

The theme check measures 20 light and 22 dark pairs. The primary action pair measures 5.78:1 in light and 7.97:1 in dark. Muted text on the raised surface measures 5.75:1 in light and 7.66:1 in dark. Forced-colors mode uses the system highlight for keyboard focus.

## Type and spacing

Use the existing self-hosted Plus Jakarta Sans variable font for the interface and display. Keep system monospace for original billing text and structured identifiers. Financial numbers use tabular figures. The ledger’s existing precision rules govern display. Text wraps on narrow screens, including wallet accounts and references.

| Role | Size |
| --- | --- |
| Demo display | 2.75–4.75rem |
| Page heading | 1.875–2.625rem |
| Section heading | 1.125rem |
| Record title | 0.9375–1rem |
| Body | 0.875rem |
| Label | 0.8125rem |
| Caption and numeric metadata | 0.75rem |
| Vault balance | 2.125–3.875rem |

Spacing uses 4, 8, 12, 16, 24, 32 and 48px steps. Controls use an 8px radius, panels 14px and featured surfaces 18px. Workspace margins grow with available viewport width. The navigation changes at 760px, and record layouts also respond to their container width. The mobile destination bar presents five destinations and More without lateral scrolling.

## Component usage

- Use `ActionButton` for async controls and keep its busy, disabled, recovery and focus behavior. Forms use persistent labels and the shared control boundary.
- Use `RecordSearch` for record search and composable filters. Counts and no-match feedback follow the filtered data. Record search matches all entered terms across relevant fields.
- Reuse `PortalShell` and `BillCard` for owner and contractor invoice surfaces. Show amounts, status, agreement, source text, attachments and validation from the same record.
- Use the balance panel for high-priority financial data. Put detailed information below it or in a named panel. Empty states explain what produces the missing record.
- Preserve specific copy and disabled states for actions involving wallet authorization, private access, vault controls and payment review.
- The Ask Nnetics dock is nonmodal on desktop. On phones the native modal keeps keyboard focus in the assistant. Escape closes it and returns focus to the launcher. The More sheet uses a native modal at the mobile breakpoint.
- Use receipts only for confirmed records. Activity preserves receipt links and copying and provides a text download using the displayed receipt.

## Motion and interaction

| Interaction | Timing and behavior |
| --- | --- |
| Control press | 120ms. A small transform gives immediate feedback without reflow. |
| Hover and focus | 160ms for surface and border transitions. Keyboard focus is visible immediately. |
| Navigation | Existing interruptible rail collapse. The active marker follows the selected destination. |
| Sheet and assistant | 260ms opening transition with a small translation and opacity change. Escape and dismissal are immediate. |
| Async records | Skeleton and labelled pending states are driven by request state. Failure exposes recovery actions. |
| Payment | Draft review, reserved preparation, pending settlement and confirmed or failed outcome follow existing API and ledger state. Amounts render directly. |
| Reduced motion | The media query disables motion and smooth scrolling. The navigation rail updates its width directly. |

The default transition curve is `cubic-bezier(.22,.72,.24,1)`. The interface uses CSS and native browser behavior without a new motion dependency. [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Framer interaction feedback](https://www.framer.com/academy/lessons/framer-animations-hover-and-press-effects)
