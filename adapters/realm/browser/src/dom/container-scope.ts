import { refs } from './addressing/refs.js';
import { isActionTarget } from './realm.js';

/**
 * Resolve a scope to its container. A container of `null` means a scope was GIVEN but resolved to
 * nothing (unmounted, or a selector that matches no element) - the caller must NOT fall back to the
 * whole page, or a scoped query silently widens into a phantom match. `scope === undefined` (no scope)
 * legitimately searches the page: `searchRoots` walks every element child of <html> other than
 * <head>, so content appended straight to documentElement is found too (#1781).
 */
export function resolveContainer(scope: string | undefined): {
  container: HTMLElement | null;
  scopeMissing: boolean;
} {
  if (scope === undefined) return { container: document.body, scopeMissing: false };
  // An SVG element is a scope too. `look` hands out refs for SVG links, and the action layer drives
  // them, so refusing one here reported a scope the page plainly has as MISSING - a floor plan whose
  // rooms are `<a href>` inside an `<svg>` could be clicked but never scoped to (#1122). The locators
  // below read only what Element has (attributes, children, text), which is also why `elementsUnder`
  // already walks SVG descendants.
  const byRef = refs.resolve(scope);
  if (isActionTarget(byRef)) return { container: byRef, scopeMissing: false };
  try {
    const found = document.querySelector(scope);
    if (isActionTarget(found)) return { container: found, scopeMissing: false };
  } catch {
    // invalid selector - treat as a missing scope, never a whole-page search
  }
  return { container: null, scopeMissing: true };
}

/**
 * The roots a query searches. A scoped query searches its container alone; an unscoped one covers
 * every element child of <html> other than <head> (#1781).
 *
 * Content appended straight to documentElement (a portal whose root is outside body, a script that
 * wrote a node before a body existed) IS visible on screen, and a find or text check that could not
 * see it reported the text as absent with no hint why. Each root is returned separately because one
 * documentElement querySelectorAll would sweep <head> in: a <title> would then answer a text query
 * with words nobody can see.
 */
export function searchRoots(scope: string | undefined, container: HTMLElement | null): HTMLElement[] {
  if (scope !== undefined) return null === container ? [] : [container];
  return Array.from(document.documentElement.children).filter(
    (child) => 'head' !== child.tagName.toLowerCase(),
  ) as HTMLElement[];
}
