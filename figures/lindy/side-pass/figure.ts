import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 19,
  "move": {
    "id": "side-pass",
    "name": "Side Pass",
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
      "description": "Travel past on offset tracks so the partnership looks like two sliding doors rather than one obstacle.",
      "steps": "Use the opening rhythm to establish parallel lanes, pass during the middle, and turn to face on the final triple. Both dancers must actually travel; shortening one track forces the other dancer to dodge.",
      "body": "Keep centers moving along their own lines and rotate only after the shoulders have cleared. The lead steps decisively aside; the follow maintains forward intention until the exit. Keep the figure narrow enough for the room.",
      "lead": "Show the follow's lane with the lead's torso and move into the complementary lane. Guide the connected hand beside—not across—the follow's body. Finish by turning the lead's own center to reorient the partnership.",
      "connection": "Initial stretch becomes light neutral contact while passing, then returns as the tracks separate. Arms stay rounded and hands travel with the bodies. Any sideways tug usually means the lead has not cleared enough space with the feet.",
      "cue": "Two parallel lanes, two traveling bodies, one shared rhythm."
    },
    "de": {
      "description": "Beim Side Pass öffnet der Lead seitlich eine Bahn, durch die der Follow am Körper vorbeireist.",
      "steps": "Der Six-Count beginnt aus einer offenen Verbindung. Der Lead tritt aus der bisherigen Spur, der Follow geht durch den entstandenen Raum. Danach richten sich beide auf der neuen Seite wieder zueinander aus.",
      "body": "Der freie Raum ist die eigentliche Figur. Wenn der Lead nur den Arm zur Seite nimmt, aber mit dem Körper im Weg bleibt, muss der Follow ausweichen. Ein echter Seitenschritt macht den Weg selbstverständlich.",
      "lead": "Die Hand bleibt ungefähr dort, wo die Reise stattfindet, und bewegt sich mit dem Follow. Sie zieht weder um die Hüfte des Leads noch quer über die Spur.",
      "connection": "Der Stretch startet die Bewegung und wird beim Vorbeigehen fast neutral. Erst wenn beide sich wieder öffnen, wird die Verbindung erneut länger.",
      "cue": "Mit dem ganzen Körper Platz machen – der Follow nimmt den freien Weg.",
      "follow": "Reise durch den sichtbaren freien Raum und erhalte deine Richtung bis am Lead vorbei. Lass dich nicht um dessen Körper herumziehen.",
      "practice": "Ist die geöffnete Bahn so eindeutig, dass der Follow sie auch ohne seitlichen Zug finden würde?"
    }
  },
  "resources": []
});
