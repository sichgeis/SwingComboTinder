export interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

export const isIntentionalHorizontalGesture = (
  start: TouchPoint,
  current: TouchPoint,
  threshold = 8
): boolean => {
  const horizontalDistance = Math.abs(current.x - start.x);
  const verticalDistance = Math.abs(current.y - start.y);
  return horizontalDistance > threshold && horizontalDistance > verticalDistance;
};

export const isIntentionalCardGesture = (
  start: TouchPoint,
  current: TouchPoint,
  threshold = 6
): boolean => {
  const horizontalDistance = Math.abs(current.x - start.x);
  const verticalDistance = Math.abs(current.y - start.y);
  return Math.max(horizontalDistance, verticalDistance) > threshold;
};
