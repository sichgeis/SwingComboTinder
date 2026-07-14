export type CardGesture = "tap" | "pass" | "keep" | "star" | "scroll" | "cancel";

interface CardGestureOptions {
  readonly flipped: boolean;
  readonly tapThreshold?: number;
  readonly decisionThreshold?: number;
  readonly starThreshold?: number;
}

export const classifyCardGesture = (
  dx: number,
  dy: number,
  { flipped, tapThreshold = 9, decisionThreshold = 90, starThreshold = 64 }: CardGestureOptions
): CardGesture => {
  const horizontalDistance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);

  if (horizontalDistance <= tapThreshold && verticalDistance <= tapThreshold) return "tap";
  if (flipped && verticalDistance > horizontalDistance) return "scroll";
  const hasUpwardIntent = dy < -starThreshold
    && (verticalDistance >= horizontalDistance || horizontalDistance < decisionThreshold);
  if (!flipped && hasUpwardIntent) return "star";
  if (dx > decisionThreshold) return "keep";
  if (dx < -decisionThreshold) return "pass";
  return "cancel";
};
