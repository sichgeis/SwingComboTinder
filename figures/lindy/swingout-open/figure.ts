import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";
import { defineFigure } from "../../define-figure";

export default defineFigure({
  card,
  "order": 16,
  "move": {
    "id": "swingout-open",
    "name": "Swingout from Open",
    "style": "lindy",
    "family": "circular",
    "count": "eight",
    "motion": "circular",
    "end": {
      "kind": "positions",
      "positions": [
        "open"
      ]
    }
  },
  "guides": {
    "en": {
      "description": "Turn open stretch into travel, shared rotation, and a new elastic open ending.",
      "steps": "Settle the open stretch, travel toward the shared center on the opening rhythm, rotate through the middle, and separate on the final triple. Both partners complete every weight change; neither rushes the opening just to create distance.",
      "body": "The follow travels through rather than being pulled to the center. The lead moves around and makes space, keeping the shared rotation mobile. Both maintain grounded pulse, relaxed shoulders, and individual balance throughout the circle.",
      "lead": "Initiate from the lead's center moving out of stretch. Shape the rotation with body position and the available closed-side contact, then open a clear exit with the torso. The hand tracks that route and never yanks the follow inward or outward.",
      "connection": "Begin in elastic stretch, reduce it as both travel together, share brief rotational compression or side connection, then rebuild stretch at the end. Arms breathe through the entire sequence; the strongest communication comes from body movement and timing.",
      "cue": "Stretch, travel, rotate, and let the final triple open the partnership."
    },
    "de": {
      "description": "Aus dem Open Stretch kommen beide zusammen, teilen eine Kreisbewegung und öffnen sich wieder – das ist der Swingout from Open.",
      "steps": "Der Rock Step spannt die Einladung vor. Der Follow reist in die Mitte, der Lead nimmt den eigenen Weg um das gemeinsame Zentrum. Nach der Rotation gehen beide auf dem letzten Triple wieder auseinander.",
      "body": "Der Follow soll nicht in der Mitte parken, sondern durch die Figur hindurchgehen. Der Lead schafft dafür Raum, indem er selbst weiterläuft. So bleibt die Bewegung rund statt eckig.",
      "lead": "Der Lead nutzt den vorhandenen Stretch, ohne daran zu reißen. Eigener Schritt und Oberkörperdrehung machen die Kreisbahn lesbar; die öffnende Seite zeigt rechtzeitig den Ausgang.",
      "connection": "Die Verbindung erzählt die ganze Figur: lang am Anfang, für einen Moment gemeinsam und tragend in der Mitte, wieder lang am Ende. Die Arme bleiben dabei federnd.",
      "cue": "Aus Stretch zusammenkommen, den Kreis teilen, wieder in Stretch öffnen.",
      "headings": {
        "steps": "Was passiert?",
        "body": "Woran du es merkst",
        "lead": "Als Lead",
        "connection": "Rhythmus und Spielraum",
        "follow": "Als Follow",
        "practice": "Frage zum Üben"
      },
      "follow": "Lass dich vom anfänglichen Stretch in die Mitte tragen und reise durch sie hindurch. Erhalte deinen Weg, bis sich der Ausgang klar öffnet.",
      "practice": "Kann der Follow die Mitte durchqueren, ohne dort zu parken oder vom Arm wieder hinausgeschickt zu werden?"
    }
  },
  "youtube": {
    "cardLinks": [
      {
        "videoId": "VSE7SD3l3uA",
        "title": "Swing Out – Learn to Lindy Hop from the Ground Up",
        "kind": "tutorial"
      },
      {
        "videoId": "4PdtcMjNqI0",
        "title": "My ‘Basic’ Swing Out Variation",
        "kind": "variation"
      },
      {
        "videoId": "tUqKiuPYxYk",
        "title": "Over-rotated Swing Outs, Switches & Savoy Twists",
        "kind": "variation"
      },
      {
        "videoId": "fHA2KdLjO08",
        "title": "Scissor Kicks & Kick Away – Swing Out Variation",
        "kind": "variation"
      }
    ]
  }
});
