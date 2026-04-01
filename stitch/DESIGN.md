# Design System Document

## 1. Overview & Creative North Star: "The Curated Laboratory"

This design system is built upon the concept of **The Curated Laboratory**. It strikes a precise balance between scientific rigor and whimsical experimentation. We are moving away from the "standard startup" look by embracing high-contrast editorial typography, expansive whitespace, and ultra-rounded forms that feel organic rather than mechanical.

The aesthetic avoids rigid grids in favor of **intentional asymmetry**. Layouts should feel like a premium gallery space—where "artifacts" (components) are placed with breathing room and tactile depth. By combining the "wide" authority of Archivo Black with the soft, inviting nature of mint and peach pastels, we create a high-end experience that is both authoritative and approachable.

---

## 2. Colors: Tonal Depth & The "No-Line" Philosophy

The palette is anchored by a clinical `background` (#effdf4) and sharp `on_background` (#121e19) elements. The "Minted Sorbet" vibe is achieved through secondary and tertiary accents that function as "highlights" in a sterile, premium environment.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. 
Boundaries must be defined through:
*   **Background Shifts:** Using `surface_container_low` (#e9f7ef) sections against a `surface` background.
*   **Vertical Space:** Utilizing the spacing scale (Tokens 12–20) to create clear mental models of separation.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of frosted glass. Use the `surface_container` tiers to create depth:
1.  **Base:** `surface` (#effdf4)
2.  **Sectioning:** `surface_container_low` (#e9f7ef) for large content blocks.
3.  **Containment:** `surface_container_highest` (#d8e6de) for nested interactive elements or cards.

### Signature Textures & Glassmorphism
To avoid a flat "out-of-the-box" appearance, floating elements (modals, tooltips, floating nav) must use **Glassmorphism**:
*   Apply `surface_container_lowest` (#ffffff) at 70% opacity.
*   Apply a `backdrop-blur` of 20px.
*   Use a subtle gradient transition from `primary` (#006c46) to `primary_container` (#4dffb2) on primary CTAs to add "soul" and dimension.

---

## 3. Typography: High-Contrast Editorial

The typography is the core of the brand's "High-End" identity. It uses a tension between the heavy, wide Display face and the clean, modern Body face.

*   **Display & Headlines:** `Archivo Black`. These should be set with tight letter-spacing (-0.02em) to emphasize the "wide" impact. Use these sparingly to anchor sections.
*   **Body & Titles:** `Plus Jakarta Sans`. This provides the "clean" and "modern" counterpoint. It is highly legible and maintains the friendly tone of the system.
*   **Labels:** `Plus Jakarta Sans` in all-caps with increased letter-spacing (+0.05em) for a technical, "laboratory" feel.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional drop shadows. Depth in this system is organic and atmospheric.

*   **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#e9f7ef) background. The 4% shift in lightness creates a sophisticated "lift" that feels premium and intentional.
*   **Ambient Shadows:** If a floating effect is required (e.g., a "Minted" CTA button), use a shadow with a 40px blur, 0% spread, and 6% opacity. The color should be `on_surface` (#121e19), never pure black.
*   **The "Ghost Border":** For high-density data where separation is critical, use the `outline_variant` (#b2ccc0) at **15% opacity**. This creates a suggestion of a container without breaking the "No-Line" rule.

---

## 5. Components: Softness & Intentionality

All components must adhere to the high roundedness scale to maintain the "cute" and "authentic" feel.

### Buttons
*   **Primary:** High-contrast `on_primary_fixed` text on a `primary_fixed` (#4dffb2) background. Radius: `full`.
*   **Secondary:** `secondary_container` (#ffdbd0) with `on_secondary_container` text. This brings in the "soft peach" accent.
*   **Interaction:** On hover, buttons should scale slightly (1.02x) rather than just changing color.

### Cards & Containers
*   **Rule:** Forbid divider lines within cards. 
*   **Styling:** Use `surface_container_highest` (#d8e6de) with a radius of `xl` (3rem). Use internal padding of `8` (2.75rem) to ensure content doesn't feel cramped.

### Input Fields
*   **Default:** `surface_container_lowest` background, radius `md` (1.5rem).
*   **Focus:** Transition the background to `primary_container` at 20% opacity. No heavy outlines.

### Chips & Tags
*   **Style:** Use `tertiary_container` (#efe58f) for "lemon" accents on active filters. Radius must be `full`.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts where the headline is offset from the body text.
*   **Do** leverage large icons or 3D assets (as seen in reference) to break the "clinical" feel with "playful" elements.
*   **Do** use `20` (7rem) spacing for major section gaps to allow the pastel colors to "breathe."

### Don't
*   **Don't** use 1px solid black borders. It destroys the "Soft Minimalism" vibe.
*   **Don't** use "Standard" 4px or 8px corners. If it's not `md` (1.5rem) or higher, it’s not part of this system.
*   **Don't** use dark mode by simply inverting colors. This system is designed for a "Fresh/Bright" editorial experience; dark mode should be handled as a separate "Midnight Laboratory" palette.