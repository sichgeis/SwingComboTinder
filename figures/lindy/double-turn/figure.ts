import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 20,
  "move": {
    "id": "double-turn",
    "name": "Double Turn",
    "style": "lindy",
    "family": "turn",
    "count": "eight",
    "motion": "rotational",
    "end": {
      "kind": "positions",
      "positions": [
        "open"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Fit two relaxed rotations into a roomy phrase only when tempo, axis, and partner response make them available.",
      "steps": "Prepare early in an eight-count phrase and preserve enough counts for two complete traveling or spotting turns plus a balanced landing. The follow keeps taking small weight changes; the lead continues rhythm and is ready to accept a single turn instead.",
      "body": "The follow stacks head, ribs, and hips over the standing foot, keeping knees soft and turn size compact. The lead gives a clear lane and does not crowd the axis. Speed comes from efficient steps, not muscular force.",
      "lead": "Offer rotational direction once, then maintain a consistent roomy hand path rather than pumping twice. Read the follow's speed and release or lower the hand as soon as a second rotation is not comfortably available.",
      "connection": "Use the lightest tone that still communicates direction. The follow supplies their own rotation and balance; the lead does not add torque through the wrist or shoulder. Reconnect softly after the axis is settled, not mid-turn.",
      "cue": "Prepare once, leave room, and happily accept one clean turn."
    },
    "de": {
      "description": "Die Double Turn ist keine kräftigere Single Turn, sondern eine Drehung, die genug Zeit, Balance und Fluss für eine zweite Runde hat.",
      "steps": "Die erste Rotation wird genauso sauber vorbereitet wie sonst. Bleiben danach noch Rhythmus und Schwung übrig, kann der Follow weiterdrehen. Die Figur endet rechtzeitig mit vollständigen Schritten und einer ruhigen Landung.",
      "body": "Der Follow hält die Schritte kompakt unter dem Körper und entscheidet mit der eigenen Balance über die zweite Runde. Der Lead sorgt vor allem für Platz.",
      "lead": "Statt mehr Kraft gibt der Lead eine gleichmäßige, leichte Drehrichtung. Öffnet der Follow den Arm, wird langsamer oder sucht die Landung, ist das Signal zum Beenden da.",
      "connection": "Die Hand bleibt beweglich und folgt der Drehung. Dauernder Zug macht die Achse schief; ein ruhiges Angebot am Ausgang hilft mehr als ein letztes Anschieben.",
      "cue": "Nur weiterdrehen, wenn die erste Runde noch Zeit und Balance übrig lässt.",
      "follow": "Beende zunächst eine vollständige erste Drehung. Nur wenn Zeit, Achse und Momentum übrig sind, lass daraus eine zweite Runde entstehen.",
      "practice": "Fühlt sich die zweite Rotation wie die Fortsetzung der ersten an oder wie eine neue, zusätzlich angeschobene Aufgabe?"
    }
  },
  "resources": []
});
