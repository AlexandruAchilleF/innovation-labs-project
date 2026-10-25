/** Section divider drawn as the EN 50549-1 limit line: the one threshold every verdict on the page is measured against. */
export function LimitRule() {
  return (
    <div aria-hidden className="mx-auto flex max-w-[1200px] items-center gap-3 px-6">
      <span className="h-px flex-1 border-t border-dashed border-pewter" />
      <span className="num text-[11px] text-smoke">253 V</span>
    </div>
  );
}
