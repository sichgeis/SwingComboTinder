import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 32,
  "move": {
    "id": "tandem-charleston",
    "name": "Tandem Charleston",
    "style": "charleston",
    "family": "tandem",
    "count": "eight",
    "motion": "linear",
    "end": {
      "kind": "positions",
      "positions": [
        "tandem"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Dance Charleston on aligned tracks with one partner behind the other and both bodies facing forward.",
      "steps": "Enter tandem through a rehearsed, leadable transition, then continue the Charleston kick-step rhythm on matching or complementary feet. Keep kicks narrow and choose a clear exit before changing direction or position.",
      "body": "Both dancers face the same way with independent balance and enough distance for safe kicks. The dancer behind tracks the front partner's center without chasing their feet. Keep knees springy and torsos lifted so the shape travels as one unit.",
      "lead": "Use hand placement and torso orientation to establish tandem before asking for movement. Lead direction through the shared frame and body travel, not by pushing the front partner's shoulders. Make entrances and exits slower and clearer than the kicks themselves.",
      "connection": "Connections may sit near the shoulders, waist, or hands depending on the entry, but all remain broad and comfortable. The frame is neutral and directional, with minimal stretch. No hand should pin an arm or restrict the front dancer's ribs.",
      "cue": "Establish tandem first, then let two independent bodies share one pulse."
    },
    "de": {
      "description": "In Tandem Charleston stehen beide hintereinander, schauen in dieselbe Richtung und teilen den Kick-Rhythmus ohne gemeinsame Fußspur.",
      "steps": "Der Einstieg bringt den Follow vor den Lead und richtet beide aus. Erst wenn diese Position ruhig steht, beginnt das gemeinsame Charleston-Muster. Der Ausgang wird mit genug Vorlauf gewählt, damit niemand aus der Reihe gezogen wird.",
      "body": "Beide tragen das eigene Gewicht. Der Follow lehnt sich nicht nach hinten, der Lead nicht nach vorn. Die Kicks bleiben auf versetzten oder getrennten Linien und passen zur verfügbaren Distanz.",
      "lead": "Der Lead baut Tandem durch den eigenen Weg auf und zeigt Richtung über den gemeinsamen Frame. Die Hände bleiben sichtbar und bequem; Führung am Rücken bedeutet Orientierung, nicht Schieben.",
      "connection": "Die Verbindung ist nah, kompakt und pulsend. Sie übermittelt Richtung und Rhythmus, lässt aber beiden genug Freiheit für Beine, Schultern und eigene Balance.",
      "cue": "Erst sauber hintereinander ausrichten, dann gemeinsam auf getrennten Spuren kicken.",
      "follow": "Trage dein Gewicht selbst, halte deine Kick-Spur frei und teile die Richtung über den Frame. Nähe bedeutet nicht, dich am Lead abzustützen.",
      "practice": "Könnt ihr den gemeinsamen Puls erhalten, ohne dass der hintere Körper den vorderen bewegt oder festhält?"
    }
  },
  "resources": [
    {
      "type": "youtube",
      "videoId": "ops1aliBCUc",
      "title": "Tandem Charleston – Lindy From the Ground Up",
      "kind": "tutorial"
    },
    {
      "type": "youtube",
      "videoId": "qBBORBZZsNQ",
      "title": "S-turn or Chase to Tandem",
      "kind": "tutorial"
    }
  ]
});
