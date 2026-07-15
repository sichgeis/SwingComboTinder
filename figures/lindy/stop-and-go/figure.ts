import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 22,
  "move": {
    "id": "stop-and-go",
    "name": "Stop & Go",
    "style": "lindy",
    "family": "rhythm",
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
      "description": "Redirect a tuck-like departure into a soft return, using shared compression rather than a hand stop.",
      "steps": "Begin like a tuck turn, allow the follow to start traveling or rotating out, then redirect back through the middle of the six-count. Both keep stepping through the change of mind and finish open with a complete final rhythm.",
      "body": "The lead changes their own direction to shape the return; the follow absorbs and responds through bent knees and center. Keep the redirection small and horizontal. A rigid torso or planted feet makes the stop feel abrupt.",
      "lead": "Signal the initial path clearly, then meet the returning connection with the body and move back into the new route. The connected hand contains the shared frame but never catches the arm or blocks the shoulder.",
      "connection": "The figure cycles from light stretch into compression and out again. Compression should build progressively so the follow can choose the rebound without surprise. Release pressure as soon as both centers have changed direction.",
      "cue": "Change your own direction and let the shared spring say 'come back.'"
    },
    "de": {
      "description": "Stop & Go fängt eine begonnene Reise weich auf und gibt sie im nächsten Moment wieder frei.",
      "steps": "Die Figur startet wie eine Drehung oder ein Tuck. Der Lead macht den kommenden Stopp früh sichtbar und nimmt den Follow in einer nahen, stabilen Position auf. Der Rhythmus läuft weiter; danach öffnet sich der Weg erneut.",
      "body": "Der Follow stoppt mit den eigenen Beinen, nicht gegen einen ausgestreckten Arm. Der Lead steht dort, wo die Reise auslaufen soll, bleibt aber selbst beweglich.",
      "lead": "Das Stop-Signal kommt aus Körperposition und Timing. Für das Go entfernt sich der Lead wieder und macht den nächsten Raum eindeutig frei. Beides muss im Zentrum lesbar sein.",
      "connection": "Der Auffangmoment ist kurz und flächig, nicht hart. Gute Kompression fühlt sich sicher an; das anschließende Release fühlt sich noch klarer an.",
      "cue": "Früh auffangen, den Rhythmus behalten, den nächsten Weg weit öffnen.",
      "follow": "Lass deine Bewegung in den angebotenen Raum hineinlaufen und stoppe mit den eigenen Füßen. Erhalte Rhythmus und Bereitschaft für den wieder geöffneten Weg.",
      "practice": "Ist der Stopp früh genug lesbar, dass er sich wie Ankommen statt wie Aufprall anfühlt?"
    }
  },
  "resources": []
});
