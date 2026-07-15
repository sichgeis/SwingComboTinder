import type { BuildChoice, Move, MoveStyle } from "./move";

export interface Decision {
  readonly index: number;
  readonly id: string;
  readonly action: BuildChoice;
}

export interface Session {
  readonly styles: MoveStyle[];
  readonly index: number;
  readonly choices: Record<string, BuildChoice>;
  readonly history: Decision[];
}

export const createSession = (styles: MoveStyle[] = ["lindy"]): Session => ({
  styles: [...styles],
  index: 0,
  choices: {},
  history: []
});

export const movesForStyles = (catalog: readonly Move[], styles: readonly MoveStyle[]): Move[] =>
  catalog.filter((move) => styles.includes(move.style));

export const recordDecision = (session: Session, move: Move, action: BuildChoice): Session => ({
  ...session,
  index: session.index + 1,
  choices: { ...session.choices, [move.id]: action },
  history: [...session.history, { index: session.index, id: move.id, action }]
});

export const undoDecision = (session: Session): Session => {
  const previous = session.history.at(-1);
  if (!previous) return session;

  const choices = { ...session.choices };
  delete choices[previous.id];
  return {
    ...session,
    index: previous.index,
    choices,
    history: session.history.slice(0, -1)
  };
};

export const reconcileSession = (session: Session, deck: readonly Move[]): Session => {
  const deckIds = new Set(deck.map(({ id }) => id));
  const choices = Object.fromEntries(Object.entries(session.choices).filter(([id]) => deckIds.has(id)));
  const history = session.history
    .filter(({ id }) => deckIds.has(id))
    .map((decision) => ({ ...decision, index: deck.findIndex(({ id }) => id === decision.id) }));
  const firstUnanswered = deck.findIndex(({ id }) => choices[id] === undefined);
  return {
    ...session,
    index: firstUnanswered === -1 ? deck.length : firstUnanswered,
    choices,
    history
  };
};
