import { useMemo, useState } from "react";
import {
  MeshButton,
  MeshLaunch,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
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
  const performerCount = Math.max(1, roster.present.length);

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

  const focusComposer = () => {
    document.getElementById("composer-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    document.querySelector<HTMLTextAreaElement>("#cue-premise")?.focus();
  };

  const launchPrimaryAction = currentCue
    ? {
        label: cues.items.length > 1 ? "Take next cue" : "Add another cue",
        onClick: cues.items.length > 1 ? takeNext : focusComposer,
        disabled: !room,
      }
    : {
        label: "Start a warm-up",
        onClick: () => addExample(EXAMPLES[0]!),
        disabled: !room,
      };

  const launchSecondaryAction = currentCue
    ? {
        label: "Clear stage",
        onClick: () => direct(null, "clear"),
        disabled: !room,
      }
    : { label: "Write a cue", onClick: focusComposer };

  return (
    <main className="director-shell">
      <MeshLaunch
        className="director-launch"
        eyebrow="A shared rehearsal room"
        heading="Improv Director"
        promise="One calm, shared cue at a time. Shape the scene together without a host, account, or distracting control room."
        presence={
          <MeshPresence
            count={performerCount}
            state={room ? "connected" : "connecting"}
            label={performerCount === 1 ? "performer in this room" : "performers in this room"}
            announce="polite"
          />
        }
        preview={
          <section className="rehearsal-stage" aria-labelledby="stage-title">
            <div className="rehearsal-stage-meta">
              <MeshStatusPill tone={currentCue ? "live" : "neutral"} dot>
                {currentCue ? "On stage now" : "Stage is open"}
              </MeshStatusPill>
              <span>
                {currentCue ? `Directed by ${currentDirection?.author}` : "Ready for an offer"}
              </span>
            </div>
            {currentCue ? (
              <>
                <h2 id="stage-title">{currentCue.premise}</h2>
                <p>{currentCue.instruction}</p>
              </>
            ) : (
              <>
                <h2 id="stage-title">The stage is open</h2>
                <p>Start a warm-up, or write a cue that gives everyone the same first offer.</p>
              </>
            )}
          </section>
        }
        primaryAction={launchPrimaryAction}
        secondaryAction={launchSecondaryAction}
        loading={!room}
        connectionHint={
          room
            ? undefined
            : "Connecting to the rehearsal room. The stage remains visible while it joins."
        }
      />

      <div className="director-workbench">
        <MeshSurface
          as="section"
          className="composer"
          tone="raised"
          padding="lg"
          aria-labelledby="composer-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Write an offer</p>
            <h2 id="composer-title">Give the room a clear next move</h2>
            <p>Premise first. Then add one playable direction that keeps the ensemble listening.</p>
          </div>
          <form onSubmit={addCue}>
            <label htmlFor="cue-premise">
              Premise
              <textarea
                id="cue-premise"
                value={premise}
                onChange={(event) => setPremise(event.target.value)}
                maxLength={160}
                placeholder="Where are we, and what just changed?"
                required
              />
            </label>
            <label htmlFor="cue-direction">
              Direction
              <textarea
                id="cue-direction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                maxLength={220}
                placeholder="A short note to focus the scene."
                required
              />
            </label>
            <MeshButton type="submit" size="lg" fullWidth disabled={!room}>
              Add cue and direct it
            </MeshButton>
          </form>
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
        </MeshSurface>

        <div className="director-sidebar">
          <MeshSurface
            as="section"
            className="identity"
            tone="quiet"
            padding="md"
            aria-labelledby="identity-title"
          >
            <div>
              <p className="eyebrow">You are playing as</p>
              <h2 id="identity-title">{name || "Unnamed performer"}</h2>
              <p>Shown beside directions in this room only.</p>
            </div>
            <MeshNameInput
              value={name}
              onChange={setName}
              ariaLabel="Your rehearsal name"
              placeholder="e.g. Sam"
              maxLength={48}
            />
          </MeshSurface>

          <MeshSurface
            as="section"
            className="warmups"
            tone="quiet"
            padding="md"
            aria-labelledby="warmups-title"
          >
            <p className="eyebrow">Warm up together</p>
            <h2 id="warmups-title">Three useful starts</h2>
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
          </MeshSurface>
        </div>
      </div>

      <MeshSurface
        as="section"
        className="cue-list"
        tone="base"
        padding="lg"
        aria-labelledby="cue-list-title"
      >
        <div className="list-heading">
          <div>
            <p className="eyebrow">Shared cue deck</p>
            <h2 id="cue-list-title">Keep the room in motion</h2>
          </div>
          <MeshStatusPill tone="neutral">{cues.items.length} saved</MeshStatusPill>
        </div>
        {cues.items.length === 0 ? (
          <p className="empty-list">
            No saved cues yet. Start with a warm-up or add the first offer.
          </p>
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
                  <MeshButton
                    size="sm"
                    variant="secondary"
                    onClick={() => direct(cue.id, "activate")}
                    disabled={!room}
                  >
                    Direct
                  </MeshButton>
                  <MeshButton
                    size="sm"
                    variant="quiet"
                    onClick={() => cues.remove(cue.id)}
                    disabled={!room}
                  >
                    Remove
                  </MeshButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </MeshSurface>

      <footer className="privacy-note">
        Browser-local peer collaboration. No accounts, analytics, camera, microphone, or scene
        recordings.
      </footer>
    </main>
  );
}
