# Functional domain research

This document records researched business-language and functional findings for Swing Thing. It exists to clarify dance concepts before they become fields, enums, validation rules, filters, or user-facing labels.

It is an input to product decisions, not an implementation specification. Source code and tests describe current behavior; approved specifications under `specs/` define authorized changes.

## How to use this document

For each investigated concept, record:

- The product question that prompted the research
- The relevant dance meaning and common variations in terminology
- The distinction Swing Thing needs, if any
- Modeling and presentation implications
- Evidence and sources
- Remaining questions that require a product or domain decision

Avoid turning ambiguous teaching vocabulary into a strict enum merely because the current catalog happens to use only a few labels.

## Partnership positions

### Closed versus side-by-side

#### Product question

Should `closed` and `side-by-side` be separate possible ending positions, or are they two names for the same Swing-dance position?

#### Finding

They are related but meaningfully different.

**Closed** primarily describes the partnership and connection. In Lindy Hop and Collegiate Shag, dancers are typically close and offset in a V-shaped relationship, with a supporting connection around the partner's back or torso. They need not face each other squarely, and the exact angle varies between dances, teachers, and communities.

**Side-by-side** primarily describes spatial orientation. The dancers stand more nearly parallel, beside one another, and generally face or travel in the same direction. Side-by-side Charleston is a common example. It can be understood as opening a closed relationship farther until the shared forward orientation becomes the defining feature.

The boundary is not universal. Some teaching vocabularies describe side-by-side Charleston as a kind of closed Charleston because the dancers still share close body and arm connection. Consequently, the terms should not be treated as universally precise physical specifications.

#### Working distinction for Swing Thing

Swing Thing should retain both values when the distinction helps someone recognize the ending shape:

| Value | Working meaning |
| --- | --- |
| `closed` | An offset, usually V-shaped Lindy/Shag partnership with a back or torso connection |
| `side-by-side` | Partners are parallel and face the same general direction, especially in partnered Charleston |

A compact visual shorthand is:

```text
Closed Lindy/Shag             Side-by-side Charleston

   Lead ↘  ↙ Follow           Lead ↑   ↑ Follow
      shared V                    parallel
```

The stored code may remain `closed`, while editorial documentation can call it a **closed V-position** to distinguish it from side-by-side. The card should continue to display the familiar label “Closed.”

#### Modeling implication

The candidate position list mixes more than one conceptual dimension:

```ts
const endPositions = [
  "open",
  "closed",
  "side-by-side",
  "wrapped",
  "tandem"
] as const;
```

- `closed` and `wrapped` partly describe connection or hold.
- `side-by-side` and `tandem` primarily describe spatial orientation.
- `open` commonly combines distance, orientation, and connection.

A fully normalized model could separate orientation from connection, but that would add complexity beyond the current card use case. The pragmatic model is one controlled ending-position vocabulary with documented working definitions.

Do not merge `closed` and `side-by-side` solely to reduce the enum. Do not infer exact body contact or hand placement from either value.

#### Sources

- [Swing dance overview](https://en.wikipedia.org/wiki/Swing_%28dance%29) describes side-by-side Charleston as opening the closed position and identifies its characteristic hip and arm connections.
- [Charleston overview](https://en.wikipedia.org/wiki/Charleston_%28dance%29) gives the same relationship between closed and side-by-side partnered Charleston.
- [Lindy Hop dance positions](https://www.lurklurk.org/lindyhop/m_dance_positions.html) describes side or promenade position as opening a closed position around a hinge-like shared side.

#### Open questions

- Should the Content Studio explain these values with short help text or examples?
- Do any current figures use `closed` where their actual ending is specifically side-by-side Charleston?
- Is “closed V-position” useful as an internal editorial label, or would it conflict with established vocabulary used by the intended dancers?

## Research-entry template

### Concept or distinction

#### Product question

#### Finding

#### Working distinction for Swing Thing

#### Modeling implication

#### Sources

#### Open questions
