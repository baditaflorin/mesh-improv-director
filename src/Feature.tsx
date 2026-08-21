import { useMemo, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  useRoster,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Cue = {
  id: string;
  premise: string;
  instruction: string;
  createdAt: number;
  author: string;
};

type Direction = {
  id: string;
  cueId: string | null;
  action: "activate" | "clear";
  at: number;
  author: string;
};

const EXAMPLES: Array<Pick<Cue, "premise" | "instruction">> = [
  {
    premise: "The museum is closing, but every exhibit has started negotiating.",
    instruction: "Start with a clear relationship. Let the objects raise the stakes.",
  },
  {
    premise: "Two neighbors discover their shared wall can answer questions.",
    instruction: "Make one choice each, then commit to the consequences.",
  },
  {
    premise: "A very serious awards show has only one category: best apology.",
    instruction: "Listen for the last word and build the next offer from it.",
  },
];

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const validText = (value: unknown, min: number, max: number) =>
  typeof value === "string" && value === clean(value) && value.length >= min && value.length <= max;

export function isValidCue(value: unknown): value is Cue {
  if (!value || typeof value !== "object") return false;
  const cue = value as Partial<Cue>;
  return (
    validText(cue.id, 16, 80) &&
    validText(cue.premise, 4, 160) &&
    validText(cue.instruction, 4, 220) &&
    validText(cue.author, 1, 48) &&
    typeof cue.createdAt === "number" &&
    Number.isFinite(cue.createdAt)
  );
}

export function isValidDirection(value: unknown): value is Direction {
  if (!value || typeof value !== "object") return false;
  const direction = value as Partial<Direction>;
  return (
    validText(direction.id, 16, 80) &&
    (direction.cueId === null || validText(direction.cueId, 16, 80)) &&
    (direction.action === "activate" || direction.action === "clear") &&
    validText(direction.author, 1, 48) &&
    typeof direction.at === "number" &&
    Number.isFinite(direction.at)
  );
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function Feature({ room, config }: Props) {
  const { name, setName, myName } = useNamedPeer(config, room);
  const roster = useRoster(room);
  const cues = useSharedCollection<Cue>(room, "mesh-improv-director:cues", {
    validate: isValidCue,
  });
  const directions = useSharedCollection<Direction>(room, "mesh-improv-director:directions", {
    validate: isValidDirection,
  });
  const [premise, setPremise] = useState("");
  const [instruction, setInstruction] = useState("");
  const [notice, setNotice] = useState("");

  const currentDirection = useMemo(
    () => [...directions.items].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id))[0],
    [directions.items],
  );
  const currentCue =
    currentDirection?.action === "activate" && currentDirection.cueId
      ? cues.byId(currentDirection.cueId)
      : undefined;

  const direct = (cueId: string | null, action: Direction["action"]) => {
    if (!room) return;
    const didAdd = directions.add({
      id: makeId("direction"),
      cueId,
      action,
      at: Date.now(),
      author: myName,
    });
    setNotice(
      didAdd
        ? action === "clear"
          ? "The stage is clear for everyone."
          : "New cue sent to the stage."
        : "Couldn't send that cue. Try again.",
    );
  };

  const addCue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPremise = clean(premise);
    const nextInstruction = clean(instruction);
    const cue: Cue = {
      id: makeId("cue"),
      premise: nextPremise,
      instruction: nextInstruction,
      createdAt: Date.now(),
      author: myName,
    };
    if (!cues.add(cue)) {
      setNotice("Use a premise of 4–160 characters and a direction of 4–220 characters.");
      return;
    }
    setPremise("");
    setInstruction("");
    direct(cue.id, "activate");
  };

  const addExample = (example: (typeof EXAMPLES)[number]) => {
    const cue: Cue = { id: makeId("cue"), ...example, createdAt: Date.now(), author: myName };
    if (cues.add(cue)) direct(cue.id, "activate");
  };

  const takeNext = () => {
    const next = cues.items.find((cue) => cue.id !== currentCue?.id);
    if (next) direct(next.id, "activate");
    else setNotice("Add a cue first, then the director can take it to the stage.");
  };

  return (
    <main className="director-shell">
      <header className="director-header">
        <p className="eyebrow">A shared rehearsal room</p>
        <h1>Improv Director</h1>
        <p className="lede">
          One calm, shared cue at a time. Add offers, direct the scene, and keep every performer on
          the same page.
        </p>
        <p className="connection" aria-live="polite">
          {room
            ? `${roster.present.length || 1} performer${(roster.present.length || 1) === 1 ? "" : "s"} here`
            : "Connecting to the room…"}
        </p>
      </header>

      <section className="stage" aria-labelledby="stage-title">
        <div className="stage-label">
          <span aria-hidden="true">●</span> On stage now
        </div>
        {currentCue ? (
          <div className="current-cue">
            <h2 id="stage-title">{currentCue.premise}</h2>
            <p>{currentCue.instruction}</p>
            <small>Directed by {currentDirection?.author}</small>
          </div>
        ) : (
          <div className="empty-stage">
            <h2 id="stage-title">The stage is open</h2>
            <p>
              Add a cue below, or choose a warm-up cue, to give everyone the same starting point.
            </p>
          </div>
        )}
        <div className="stage-actions">
          <button type="button" className="primary" onClick={takeNext}>
            Take next cue
          </button>
          <button
            type="button"
            className="quiet"
            onClick={() => direct(null, "clear")}
            disabled={!room || !currentCue}
          >
            Clear stage
          </button>
        </div>
      </section>

      <section className="identity" aria-labelledby="identity-title">
        <div>
          <h2 id="identity-title">Your rehearsal name</h2>
          <p>Shown beside directions; it stays in your browser and this room.</p>
        </div>
        <MeshNameInput
          value={name}
          onChange={setName}
          ariaLabel="Your rehearsal name"
          placeholder="e.g. Sam"
          maxLength={48}
        />
      </section>

      <section className="composer" aria-labelledby="composer-title">
        <div className="section-heading">
          <p className="eyebrow">Add an offer</p>
          <h2 id="composer-title">Write the next cue</h2>
        </div>
        <form onSubmit={addCue}>
          <label>
            Premise
            <textarea
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
              maxLength={160}
              placeholder="Where are we, and what just changed?"
              required
            />
          </label>
          <label>
            Direction
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={220}
              placeholder="A short note to focus the scene."
              required
            />
          </label>
          <button className="primary" type="submit" disabled={!room}>
            Add cue and direct it
          </button>
        </form>
        <p className="notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>

      <section className="warmups" aria-labelledby="warmups-title">
        <h2 id="warmups-title">Quick warm-up cues</h2>
        <div className="example-grid">
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example.premise}
              onClick={() => addExample(example)}
              disabled={!room}
            >
              <strong>{example.premise}</strong>
              <span>{example.instruction}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cue-list" aria-labelledby="cue-list-title">
        <div className="list-heading">
          <div>
            <p className="eyebrow">Shared deck</p>
            <h2 id="cue-list-title">All cues</h2>
          </div>
          <span>{cues.items.length} total</span>
        </div>
        {cues.items.length === 0 ? (
          <p className="empty-list">No saved cues yet. Warm-up cues are a good first offer.</p>
        ) : (
          <ol>
            {cues.items.map((cue) => (
              <li key={cue.id} className={cue.id === currentCue?.id ? "is-current" : ""}>
                <div>
                  <strong>{cue.premise}</strong>
                  <p>{cue.instruction}</p>
                  <small>Added by {cue.author}</small>
                </div>
                <div className="cue-actions">
                  <button type="button" onClick={() => direct(cue.id, "activate")} disabled={!room}>
                    Direct
                  </button>
                  <button
                    type="button"
                    className="remove"
                    onClick={() => cues.remove(cue.id)}
                    disabled={!room}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="privacy-note">
        Browser-local peer collaboration. No accounts, analytics, camera, microphone, or scene
        recordings.
      </footer>
    </main>
  );
}
