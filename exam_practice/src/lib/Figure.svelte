<script lang="ts">
  import { render } from 'misty-states/render';
  let { source, label = 'Quantum state or circuit', compact = false, variant = 'default' }: { source: string; label?: string; compact?: boolean; variant?: 'default' | 'choice' | 'gate' } = $props();
  const id = $props.id();
  const drawing = $derived.by(() => {
    try { return render(source || '?', { idPrefix: `practice-${id}`, background: false, check: false }).svg; }
    catch { return ''; }
  });
</script>
<div class:compact class:choice-figure={variant === 'choice'} class:gate-figure={variant === 'gate'} class="figure" role="img" aria-label={label}>
  {#if drawing}{@html drawing}{:else}<span class="muted">Complete the drawing to preview it.</span>{/if}
</div>

<style>
  .figure { display: flex; align-items: center; justify-content: center; width: 100%; min-width: 0; padding: 12px; background: var(--paper); border-radius: 10px; color: #222; }
  .figure :global(svg) { display: block; max-width: 100%; max-height: 290px; width: auto; height: auto; }
  .compact { padding: 0; background: transparent; width: auto; }
  .compact :global(svg) { width: auto; height: 28px; max-width: 80px; }
  .choice-figure { padding: 4px 8px; }
  .choice-figure :global(svg) { height: 52px; max-height: 60px; }
  .gate-figure { padding: 0; width: auto; background: transparent; pointer-events: none; }
  .gate-figure :global(svg) { height: 42px; max-width: 90px; }
  @media (max-height: 680px) { .figure:not(.compact) :global(svg) { max-height: 210px; } }
  @media (max-width: 700px) { .figure:not(.compact) :global(svg) { max-height: 240px; } }
</style>
