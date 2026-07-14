import type { Move } from "./move";
import type { Session } from "./session";

export interface Combo {
  readonly label: string;
  readonly title: string;
  readonly steps: Move[];
  readonly note: string;
}

const seededShuffle = (items: readonly Move[], seed: number): Move[] => {
  const copy = [...items];
  let value = seed + 17;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    value = (value * 9301 + 49297) % 233280;
    const swapIndex = Math.floor((value / 233280) * (index + 1));
    const current = copy[index];
    const replacement = copy[swapIndex];
    if (current && replacement) [copy[index], copy[swapIndex]] = [replacement, current];
  }
  return copy;
};

const uniqueMoves = (moves: readonly Move[]): Move[] =>
  moves.filter((move, index) => moves.findIndex((candidate) => candidate.id === move.id) === index);

export const generateCombos = (deck: readonly Move[], session: Session): Combo[] => {
  if (deck.length === 0) return [];

  const chosen = deck.filter((move) => ["keep", "star"].includes(session.choices[move.id] ?? ""));
  const starred = deck.filter((move) => session.choices[move.id] === "star");
  const remaining = deck.filter((move) => session.choices[move.id] !== "pass");
  const allowed = chosen.length >= 3 ? chosen : uniqueMoves([...chosen, ...remaining]);
  const shuffled = seededShuffle(allowed.length > 0 ? allowed : deck, session.comboSeed);

  const pick = (patterns: readonly string[], used: readonly string[], source: readonly Move[]): Move | undefined =>
    source.find((move) => !used.includes(move.id) && patterns.some((pattern) => move.family.includes(pattern)));
  const adventure = starred.length > 0
    ? starred[session.comboSeed % starred.length]
    : pick(["Turn", "Tandem", "Position"], [], shuffled);

  const buildSteps = (patterns: readonly string[], featured?: Move, offset = 0): Move[] => {
    const source = [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    const result: Move[] = [];
    for (const pattern of patterns) {
      const move = pick([pattern], result.map(({ id }) => id), source);
      if (move) result.push(move);
    }
    if (featured && !result.some(({ id }) => id === featured.id)) result.splice(Math.min(1, result.length), 0, featured);
    return uniqueMoves([...result, ...source]).slice(0, 5);
  };

  return [
    {
      label: "01 · WARM-UP",
      title: "Find the shared rhythm",
      steps: buildSteps(["Rhythm", "Travel", "Linear", "Transition"]),
      note: "Start with pulse and an easy pathway. Let the selected style settle before adding a bigger turn."
    },
    {
      label: "02 · FLOW LOOP",
      title: "Travel, turn, reconnect",
      steps: buildSteps(["Circular", "Turn", "Linear", "Position"], undefined, 2),
      note: "Keep each transition readable. The change in pathway matters more than fitting in every figure."
    },
    {
      label: "03 · LITTLE ADVENTURE",
      title: adventure ? `Spotlight: ${adventure.name}` : "One brave little choice",
      steps: buildSteps(["Rhythm", "Turn", "Transition", "Travel"], adventure, 4),
      note: "Try the spotlight once with good space. If connection gets unclear, return to pulse and a familiar pathway."
    }
  ];
};
