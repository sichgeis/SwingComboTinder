import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 21,
  "move": {
    "id": "traveling-tuck",
    "name": "Traveling Tuck",
    "alias": "Tuck on the move",
    "style": "lindy",
    "family": "Turn",
    "count": "6 or 8 count",
    "motion": "Linear",
    "end": "Open",
    "familiarity": "New territory",
    "flows": "sugar push · send out · pass by"
  },
  "guides": {
    "en": {
      "description": "Layer a tuck-and-release turn onto forward travel without sacrificing the follow's lane.",
      "steps": "Commit to the traveling route first. Meet a brief compression while both are still moving, redirect the torso, and let the follow turn along the lane before the final rhythm. The lead keeps traveling enough to avoid anchoring the figure in place.",
      "body": "The follow's center continues forward while the torso receives rotation; feet stay beneath the moving axis. The lead clears the track and rotates with the partnership. Keep the tuck compact so momentum remains readable.",
      "lead": "Create travel with the lead's body, meet and redirect compression through the frame, then give the hand a spacious turn path. Do not use the tuck to stop the follow and restart them—the direction change should be one continuous sentence.",
      "connection": "Stretch initiates travel, brief compression supplies the tuck, and the release becomes light rotational connection. Arms absorb the changing distance without locking. Rebuild open stretch only after the traveling turn has landed.",
      "cue": "Keep the lane moving while compression redirects the turn."
    },
    "de": {
      "description": "Der Traveling Tuck kombiniert den federnden Moment einer Tuck Turn mit einer klaren Reise durch den Raum.",
      "steps": "Zuerst wird die Bahn sichtbar. Darauf entsteht ein kurzer Tuck-Moment: beide kommen etwas näher und nehmen die Bewegung auf. Das anschließende Öffnen schickt die Drehung entlang der Bahn weiter.",
      "body": "Kompression und Reise dürfen sich nicht gegenseitig stoppen. Beide bleiben über beweglichen Füßen; der Follow dreht weiter vorwärts, der Lead geht aus der Spur und begleitet.",
      "lead": "Der Lead führt erst den Weg, dann die Feder. Das Release zeigt in Reiserichtung. Ein Druck direkt auf den Follow würde die Bahn blockieren statt sie zu öffnen.",
      "connection": "Die Verbindung wird kurz dichter und danach sofort leichter. Die gespeicherte Energie ist als Richtung spürbar, nicht als Stoß aus den Händen.",
      "cue": "Die Bahn festlegen, kurz einfedern, die Energie auf dieser Bahn freigeben.",
      "headings": {
        "steps": "Was passiert?",
        "body": "Woran du es merkst",
        "lead": "Als Lead",
        "connection": "Rhythmus und Spielraum",
        "follow": "Als Follow",
        "practice": "Frage zum Üben"
      },
      "follow": "Beantworte den Tuck, ohne deine Reise zu verlieren. Lass die Richtungsänderung die Drehung auf der bereits sichtbaren Bahn freigeben.",
      "practice": "Bleibt trotz Kompression klar, wohin die Figur reist, oder verschwindet die Bahn im Tuck-Moment?"
    }
  },
  "youtube": {
    "teachingSources": [
      {
        "videoId": "oXYuMyufF9s",
        "timestampSeconds": 216,
        "frame": "teaching-frames/selected.png",
        "notes": "Source listed for the selected teaching frame."
      },
      {
        "videoId": "mfHIZtTyLBo",
        "notes": "Artwork reference selection."
      },
      {
        "videoId": "oXYuMyufF9s",
        "notes": "Reference catalog candidate (Exact traveling-tuck tutorial). Key frame: Show the tuck turning while progressing across the floor rather than rotating in place."
      }
    ],
    "cardLinks": [
      {
        "videoId": "LX3WPFUpSEc",
        "title": "Alllll the Tuck Turns",
        "kind": "tutorial"
      },
      {
        "videoId": "zTlnB-tcMio",
        "title": "Changing the Rhythm in Tuck Turns",
        "kind": "variation"
      }
    ]
  }

});
