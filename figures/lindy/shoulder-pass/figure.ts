import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 23,
  "move": {
    "id": "shoulder-pass",
    "name": "Shoulder Pass",
    "style": "lindy",
    "family": "linear",
    "count": "six",
    "motion": "linear",
    "end": {
      "kind": "positions",
      "positions": [
        "open"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Create a close-looking pass by moving the lead out of the lane, never by pulling the follow near.",
      "steps": "Establish forward travel, let the follow pass beside the lead's shoulder during the middle rhythm, and reopen on the final triple. The lead travels and rotates out of the track; the follow stays on a predictable line.",
      "body": "Proximity comes from well-placed tracks, not from leaning bodies together. Keep shoulders relaxed, ribs stacked, and heads on separate lines. The lead turns after clearing space so the follow never meets a closed door.",
      "lead": "Invite travel with the center and guide the connected hand past the lead's relaxed shoulder. Move the shoulder away rather than presenting it as a barrier. Reorient through the torso to offer the exit.",
      "connection": "Start with elastic open tone, soften while passing, and let stretch return after separation. The hand remains mobile and never pulls the follow into the lead's body. Reduce closeness immediately if either dancer braces.",
      "cue": "Move the shoulder out of the track; let the follow own the lane."
    },
    "de": {
      "description": "Beim Shoulder Pass reist der Follow dicht an der geöffneten Schulter des Leads vorbei, ohne auf dessen Spur gezogen zu werden.",
      "steps": "Der Lead dreht und tritt so, dass neben der Schulter eine Durchfahrt entsteht. Der Follow geht auf der eigenen Bahn hindurch. Nach dem Passieren finden beide auf der neuen Seite wieder Orientierung.",
      "body": "Nähe entsteht hier durch gut gelegte Spuren. Beide bleiben aufrecht; niemand muss sich zur Schulter hinlehnen oder darunter wegducken.",
      "lead": "Der Lead öffnet die eigene Körperseite und hält die Hand auf dem Weg des Follows. Die Schulter wird aus der Bahn genommen, statt den Follow an sie heranzuholen.",
      "connection": "Im engsten Moment ist die Verbindung leicht. Arm und Schulter brauchen Bewegungsfreiheit. Erst wenn wieder Abstand entsteht, darf sich die Handverbindung verlängern.",
      "cue": "Die Schulter öffnet die Tür; der Follow geht auf der eigenen Spur hindurch.",
      "follow": "Bleib auf deiner Spur und reise an der geöffneten Schulter vorbei. Nähe ist hier kein Grund, den Körper zur Verbindung hin zu neigen.",
      "practice": "Entsteht die enge Passage durch gute Spuren oder wird der Follow mit der Hand an die Schulter herangeholt?"
    }
  },
  "resources": []
});
