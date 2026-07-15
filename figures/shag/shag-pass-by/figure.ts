import card from "./card.jpg?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 38,
  "move": {
    "id": "shag-pass-by",
    "name": "Shag Pass-By Turn",
    "style": "shag",
    "family": "shag-turn",
    "count": "six",
    "motion": "linear",
    "end": {
      "kind": "positions",
      "positions": [
        "open",
        "closed"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Exchange tracks with compact Shag footwork, keeping the passing lane clearer than the hand pattern.",
      "steps": "Use the slow actions to establish forward travel and offset lanes, then pass and reorient through the quick-quicks. Continue directly into the next slow so the figure never becomes a stop-and-pose.",
      "body": "Both dancers travel their centers past one another while maintaining the small hop-step quality. Keep feet narrow, knees soft, and shoulders above hips. Rotate only after the shared track is clear.",
      "lead": "Move the lead's body off the follow's lane and guide the connected side through the available opening. The hand indicates orientation but never pulls the follow across. Prepare the desired open or closed ending before the quicks finish.",
      "connection": "Close connection opens into a compact hand connection while passing, then reforms without a jerk. Use responsive tone and minimal distance—Shag does not need a large Lindy-style stretch to make the route readable.",
      "cue": "Clear the track on the slows and pass compactly on quick-quick."
    },
    "de": {
      "description": "Beim Shag Pass-By wechseln beide auf engen Parallelspuren die Plätze, ohne den schnellen Rhythmus für die Drehung zu opfern.",
      "steps": "Der Lead verlässt die bisherige Spur, der Follow reist durch den freien Raum. Slow-Slow-Quick-Quick bleibt durchgehend erhalten. Erst auf der neuen Seite wird die kompakte Drehung fertig und die offene Verbindung neu gefunden.",
      "body": "Die Reise kommt vor der Rotation. Beide Zentren passieren sich aufrecht, die Füße bleiben eng unter dem Körper. So bleibt genug Zeit für die Drehung.",
      "lead": "Der Lead öffnet mit dem eigenen Schritt und lässt die Hand auf der Bahn des Follows mitlaufen. Ein kleiner Turn-Bogen reicht; ein großer Armkreis wäre bei diesem Tempo zu spät.",
      "connection": "Der Startstretch wird beim Passieren fast neutral. Am Ausgang entsteht er neu. Hand und Ellbogen bleiben so beweglich, dass sie den schnellen Gewichtswechseln folgen können.",
      "cue": "Erst vorbeigehen, dann kompakt drehen – der Shag-Rhythmus läuft weiter.",
      "headings": {
        "steps": "Was passiert?",
        "body": "Woran du es merkst",
        "lead": "Als Lead",
        "connection": "Rhythmus und Spielraum",
        "follow": "Als Follow",
        "practice": "Frage zum Üben"
      },
      "follow": "Nimm die frei gewordene enge Spur und reise zuerst am Lead vorbei. Halte die anschließende Drehung klein genug für den laufenden Rhythmus.",
      "practice": "Bleibt Slow-Slow-Quick-Quick unverändert, während eure Zentren tatsächlich die Plätze tauschen?"
    }
  },
  "youtube": {
    "cardLinks": []
  }
});
