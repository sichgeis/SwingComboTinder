import { figureFor } from "../../figures/catalog";
import type { Language, Move, MoveGuide } from "./move";

export const guideFor = (move: Move, language: Language): MoveGuide =>
  figureFor(move.id).guides[language];
