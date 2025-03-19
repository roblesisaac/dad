import Draggable from 'vuedraggable';

export function useDraggable() {
  const dragOptions = {
    animation: 200,
    delay: 100,
    touchStartThreshold: 100
  };

  return { dragOptions, Draggable };
}