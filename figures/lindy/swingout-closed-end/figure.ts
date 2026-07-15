import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 27,
  "move": {
    "id": "swingout-closed-end",
    "name": "Swingout to Closed",
    "style": "lindy",
    "family": "transition",
    "count": "eight",
    "motion": "circular",
    "end": {
      "kind": "positions",
      "positions": [
        "closed"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Redirect the swingout exit early enough that both dancers continue the circle and finish collected.",
      "steps": "Dance the familiar swingout entry and shared rotation. Instead of releasing fully to open, continue the circular travel and bring the follow beside the lead during the final rhythm. Both complete the last triple in closed without a sudden stop.",
      "body": "The lead keeps moving around the circle and makes a visible landing space at the side. The follow follows the continuing pathway rather than opening away. Both stay upright and let feet—not arms—close the distance.",
      "lead": "Communicate the closed destination before the final triple by maintaining rotation and shaping the lead's side toward the follow. Offer the back connection as the follow arrives; do not open fully and then pull them back.",
      "connection": "The shared rotational frame remains supportive instead of lengthening into maximum stretch. Closed-side contact grows gradually on arrival. Keep the outside hand soft and avoid squeezing the follow into position.",
      "cue": "Choose closed early and keep the circle traveling into the landing."
    },
    "de": {
      "description": "Beim Swingout to Closed öffnet sich der Kreis am Ende nicht, sondern sammelt beide wieder nebeneinander ein.",
      "steps": "Einstieg und Mitte fühlen sich wie ein normaler Swingout an. Schon vor dem letzten Triple bleibt die Kreisbahn jedoch geschlossen. Der Lead reist weiter und der Follow landet auf dem freien Platz an seiner Seite.",
      "body": "Das Ziel muss früh im Bewegungsweg liegen. Wenn beide erst vollständig auseinandergehen, ist Closed nur noch durch Zurückziehen erreichbar. Bleibt der Kreis erhalten, schließen die Füße den Abstand.",
      "lead": "Der Lead setzt die eigene Rotation fort, formt die Seite zur Ankunft und bietet dort die Rückenverbindung an. Die Entscheidung für Closed kommt aus diesem Weg, nicht aus der Außenhand.",
      "connection": "Die Verbindung bleibt in der zweiten Hälfte tragender und wird nicht zum maximalen Stretch. Closed wächst beim Ankommen allmählich und darf danach wieder weich werden.",
      "cue": "Closed früh entscheiden und den Kreis bis auf den gemeinsamen Platz tanzen.",
      "headings": {
        "steps": "Was passiert?",
        "body": "Woran du es merkst",
        "lead": "Als Lead",
        "connection": "Rhythmus und Spielraum",
        "follow": "Als Follow",
        "practice": "Frage zum Üben"
      },
      "follow": "Folge der weiterlaufenden Kreisbahn bis auf den Platz neben dem Lead. Öffne nicht automatisch in maximalen Stretch, wenn der gemeinsame Weg geschlossen bleibt.",
      "practice": "Ist Closed früh im Weg angelegt, oder muss der Follow nach einem offenen Ausgang wieder eingesammelt werden?"
    }
  },
  "youtube": {
    "cardLinks": [
      {
        "videoId": "VSE7SD3l3uA",
        "title": "Swing Out – Learn to Lindy Hop from the Ground Up",
        "kind": "tutorial"
      }
    ]
  }
});
