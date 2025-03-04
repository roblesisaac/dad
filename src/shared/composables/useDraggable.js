export function useDraggable() {
  const dragOptions = (delayMs=100) => ({
    animation: 200,
    delay: delayMs,
    touchStartThreshold: 100
  });

  return { dragOptions };
}