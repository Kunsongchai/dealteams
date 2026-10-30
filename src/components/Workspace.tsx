// src/components/Workspace.tsx
import { useState } from "react";
import CardCollection from "./CardCollection";
import {
  CATEGORIES,
  RoomState,
  ViewType,
  Task,
  ModalConfig,
  TaskStatusLabel,
} from "../supabase";
import { VIEW_NAMES, SUITS } from "./Sidebar";

const STATUSES: TaskStatusLabel[] = ["ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"];

export function formatDate(value?: string): string {
  if (!value) return "ไม่กำหนดวันส่ง";
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime())
    ? "ไม่กำหนดวันส่ง"
    : d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

interface WorkspaceProps {
  room: RoomState;
  profile: string;
  view: ViewType;
  group: string;
  onNavigate: (view: ViewType, group?: string) => void;
  onGoHome: () => void;
  onRefresh: () => void;
  onOpenModal: (config: ModalConfig) => void;
}

export default function Workspace({
  room,
  profile,
  view,
  group,
  onNavigate,
  onGoHome,
  onRefresh,
  onOpenModal,
}: WorkspaceProps) {
  const [search, setSearch] = useState<string>("");

  const isMine = (ownerId: string | null) =>
    ownerId === room.myMemberId || ownerId === "me";

  const memberName = (id: string | null): string => {
    if (!id) return "ยังไม่มีคนรับ";
    if (isMine(id)) return profile;
    return room.members.find((m) => m.id === id)?.name || "สมาชิกทีม";
  };

  const renderAvatar = (id: string | null) => {
    const m = room.members.find((x) => x.id === id) ||
      room.members[0] || { color: "#d6e2bf" };
    return (
      <span className="avatar-circle" style={{ background: m.color }}>
        {memberName(id).slice(0, 1)}
      </span>
    );
  };

  const renderBadge = (task: Task) => {
    const type = task.help
      ? "help"
      : task.status === "กำลังทำ"
        ? "working"
        : task.status === "เสร็จแล้ว"
          ? "done"
          : "";
    return (
      <span className={`status-pill ${type}`}>
        {task.help ? "อยากให้ช่วย" : task.status}
      </span>
    );
  };

  const renderBreadcrumbs = (extra = "") => (
    <div className="crumbs">
      <button className="text-link" onClick={onGoHome}>
        หน้าหลัก
      </button>
      <span>/</span>
      <button className="text-link" onClick={() => onNavigate("overview")}>
        {room.name}
      </button>
      {view !== "overview" && (
        <>
          <span>/</span>
          <button className="text-link" onClick={() => onNavigate(view)}>
            {VIEW_NAMES[view]}
          </button>
        </>
      )}
      {extra && (
        <>
          <span>/</span>
          <strong>{extra}</strong>
        </>
      )}
    </div>
  );

  if (view === "overview") {
    const done = room.tasks.filter((t) => t.status === "เสร็จแล้ว").length;
    const working = room.tasks.filter((t) => t.status === "กำลังทำ").length;
    const available = room.tasks.filter((t) => !t.owner).length;
    const mine = room.tasks.filter((t) => isMine(t.owner));
    const friendsCount = Math.max(
      0,
      room.members.filter((m) => !isMine(m.id)).length,
    );

    const decks: [ViewType, string, string, string][] = [
      ["all", "♣", "งานทั้งหมด", `${room.tasks.length} ใบ`],
      ["mine", "♠", "งานในมือ", `${mine.length} ใบ`],
      ["friends", "♥", "งานของเพื่อน", `${friendsCount} คน`],
      ["ideas", "♦", "สไตล์งาน", `${room.ideas.length} ใบ`],
    ];

    return (
      <>
        {renderBreadcrumbs()}
        <header className="workspace-heading">
          <div>
            <h1>{room.name}</h1>
            <p>{room.brief}</p>
          </div>
          <div className="heading-actions">
            {!room.demo && (
              <button className="btn btn-soft-custom" onClick={onRefresh}>
                ↻ อัปเดตโต๊ะ
              </button>
            )}
            <button
              className="btn btn-soft-custom"
              onClick={() => onOpenModal({ type: "invite" })}
            >
              รหัสห้อง
            </button>
            <button
              className="btn btn-accent-custom"
              onClick={() => onOpenModal({ type: "draw" })}
            >
              ✧ จั่วงานสักใบ ✧
            </button>
          </div>
        </header>

        <section className="stat-strip">
          {(
            [
              [room.tasks.length, "งานทั้งหมด", "♣"],
              [working, "กำลังทำ", "♠"],
              [done, "ทำสำเร็จแล้ว", "♥"],
              [available, "รอคนรับเข้ามือ", "♦"],
            ] as [number, string, string][]
          ).map(([num, label, icon]) => (
            <div key={label} className="stat-item">
              <b className="stat-number">{num}</b>
              <span className="stat-label">{label}</span>
              <span className="stat-icon">{icon}</span>
            </div>
          ))}
        </section>

        <div className="dashboard-grid">
          <section className="game-table">
            <header className="table-heading"></header>
            <div className="table-decks">
              {decks.map(([deckView, suit, title, countBadge], i) => (
                <button
                  key={deckView}
                  className="stack-card"
                  onClick={() => onNavigate(deckView)}
                >
                  <span
                    className={`card-corner ${i > 1 ? "red" : ""}`}
                    aria-hidden="true"
                  >
                    {suit}
                  </span>
                  <span className="stack-badge">{countBadge}</span>
                  <span className="stack-content">
                    <b>{title}</b>
                  </span>
                  <span></span>
                  <br></br>
                  <span
                    className={`card-corner bottom ${i > 1 ? "red" : ""}`}
                    aria-hidden="true"
                  >
                    {suit}
                  </span>
                </button>
              ))}
              <div className="table-seal" aria-hidden="true">
                <span>♣</span>
                <b>DealTeams</b>
              </div>
            </div>
            <footer className="table-bottom">
              <button onClick={() => onOpenModal({ type: "guide" })}>
                วิธีใช้โต๊ะนี้
              </button>
            </footer>
          </section>

          <aside className="dashboard-aside">
            <section className="side-panel">
              <div className="panel-heading">
                <h2>สมาชิกบนโต๊ะ</h2>
                <span className="text-link">
                  {room.demo ? "ห้องตัวอย่าง" : "ออนไลน์"}
                </span>
              </div>
              <div
                className="team-row"
                style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}
              >
                {room.members.slice(0, 5).map((m) => (
                  <span key={m.id}>{renderAvatar(m.id)}</span>
                ))}
                <span>
                  {room.members.length} คน{room.demo ? " (ตัวอย่าง)" : ""}
                </span>
              </div>
            </section>
          </aside>
        </div>
      </>
    );
  }

  const groupOptions: string[] =
    view === "all"
      ? ["ทั้งหมด", ...CATEGORIES, "ยังไม่มีคนรับ"]
      : view === "mine"
        ? ["ทั้งหมด", ...STATUSES, "อยากให้ช่วย"]
        : view === "ideas"
          ? ["ทั้งหมด", "ทีมตกลงใช้", "กำลังเสนอ"]
          : [];

  const groupLabel = view === "friends" && group ? memberName(group) : group;
  const pageTitle =
    view === "friends" && group
      ? `ไพ่ในมือ ${memberName(group)}`
      : VIEW_NAMES[view];

  const friendsList = room.members.filter(
    (m) => !isMine(m.id) && m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredIdeas = room.ideas
    .filter(
      (i) => !group || (group === "ทีมตกลงใช้" ? i.approved : !i.approved),
    )
    .filter((i) =>
      `${i.title} ${i.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const filteredTasks = room.tasks
    .filter((t) => view !== "mine" || isMine(t.owner))
    .filter((t) => view !== "friends" || t.owner === group)
    .filter((t) => {
      if (view === "friends" || !group || group === "ทั้งหมด") return true;
      if (group === "ยังไม่มีคนรับ") return !t.owner;
      if (group === "อยากให้ช่วย") return t.help;
      return view === "mine" ? t.status === group : t.category === group;
    })
    .filter((t) =>
      `${t.title} ${t.description} ${memberName(t.owner)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const count =
    view === "friends" && !group
      ? friendsList.length
      : view === "ideas"
        ? filteredIdeas.length
        : filteredTasks.length;

  return (
    <>
      {renderBreadcrumbs(groupLabel)}
      <header className="workspace-heading">
        <div>
          <h1>{pageTitle}</h1>
        </div>
        <div className="heading-actions">
          {["all", "mine"].includes(view) && (
            <>
              <button
                className="btn btn-soft-custom"
                onClick={() => onOpenModal({ type: "draw" })}
              >
                ✧ จั่วงาน
              </button>
              <button
                className="btn btn-accent-custom"
                onClick={() => onOpenModal({ type: "task-form" })}
              >
                ＋ เพิ่มไพ่งาน
              </button>
            </>
          )}
          {view === "ideas" && (
            <button
              className="btn btn-accent-custom"
              onClick={() => onOpenModal({ type: "idea-form" })}
            >
              ＋ เพิ่มไอเดีย
            </button>
          )}
          {view === "friends" && group && (
            <button
              className="btn btn-soft-custom"
              onClick={() => onNavigate("friends", "")}
            >
              ← เลือกเพื่อนคนอื่น
            </button>
          )}
        </div>
      </header>

      <div className="tools-row">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              view === "friends" && !group
                ? "ค้นหาชื่อเพื่อน…"
                : view === "ideas"
                  ? "ค้นหาไอเดีย…"
                  : "ค้นหางาน…"
            }
            maxLength={100}
          />
        </label>
        <span className="view-count">
          {count} {view === "friends" && !group ? "คน" : "ใบ"}
        </span>
      </div>

      {groupOptions.length > 0 && (
        <div className="tabs-row">
          {groupOptions.map((g) => (
            <button
              key={g}
              className={`filter-chip ${(!group && g === "ทั้งหมด") || group === g ? "active" : ""}`}
              onClick={() => onNavigate(view, g === "ทั้งหมด" ? "" : g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {count === 0 ? (
        <div className="empty-state">
          <span>{SUITS[view]}</span>
          <h2>{search ? "ยังไม่เจอไพ่ที่ค้นหา" : "กองนี้ยังว่างอยู่"}</h2>
          <p>
            {search
              ? "ลองค้นหาด้วยชื่ออื่น"
              : view === "friends"
                ? "สมาชิกและงานของเพื่อนจะปรากฏที่นี่เมื่อเพื่อนเข้าร่วมห้อง"
                : "เริ่มจากไพ่ใบเดียว แล้วเติมไปด้วยกัน"}
          </p>
          {!search && ["all", "mine", "ideas"].includes(view) && (
            <button
              className="btn btn-accent-custom"
              onClick={() =>
                onOpenModal({
                  type: view === "ideas" ? "idea-form" : "task-form",
                })
              }
            >
              ＋ {view === "ideas" ? "เพิ่มไอเดียแรก" : "เพิ่มไพ่งานแรก"}
            </button>
          )}
        </div>
      ) : view === "friends" && !group ? (
        <CardCollection
          key={`friends:${search}`}
          mode="stacks"
          tone="neutral"
          cards={friendsList.map((m) => {
            const mTasks = room.tasks.filter((t) => t.owner === m.id);
            return {
              id: m.id,
              title: m.name,
              onOpen: () => onNavigate("friends", m.id),
              face: (
                <>
                  <span className="playing-index red">
                    ♥<small>{String(mTasks.length).padStart(2, "0")}</small>
                  </span>
                  <span className="member-deck-count">{mTasks.length} ใบ</span>
                  <span className="member-deck-center">
                    {renderAvatar(m.id)}
                    <h2>{m.name}</h2>
                    <p>{m.role || "เพื่อนร่วมโต๊ะ"}</p>
                  </span>
                  <span className="member-deck-stats">
                    <span>
                      <b>
                        {mTasks.filter((t) => t.status !== "เสร็จแล้ว").length}
                      </b>{" "}
                      งานในมือ
                    </span>
                    <span>
                      <b>
                        {mTasks.filter((t) => t.status === "เสร็จแล้ว").length}
                      </b>{" "}
                      สำเร็จแล้ว
                    </span>
                  </span>
                  <span className="playing-index bottom red">♥</span>
                  <span className="open-deck-hint">เปิดกองไพ่ ↗</span>
                </>
              ),
            };
          })}
        />
      ) : view === "ideas" ? (
        <CardCollection
          key={`ideas:${group}:${search}`}
          mode="hand"
          tone="orange"
          cards={filteredIdeas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            onOpen: () => onOpenModal({ type: "idea-detail", ideaId: idea.id }),
            face: (
              <>
                <span className="playing-index red">♦</span>
                <span className="playing-category">{idea.category}</span>
                <span className="idea-playing-image">
                  {idea.image ? (
                    <img src={idea.image} alt="" loading="lazy" />
                  ) : idea.kind === "palette" ? (
                    <span className="playing-palette">
                      {[
                        "#252729",
                        "#174d39",
                        "#f4f1e7",
                        "#c9e1a9",
                        "#ad554a",
                      ].map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                  ) : (
                    <span className="playing-type">
                      {idea.kind === "type" ? "Aa กข" : "♦"}
                    </span>
                  )}
                </span>
                <h2 className="playing-title">{idea.title}</h2>
                <p className="playing-description">{idea.description}</p>
                <span className="playing-foot">
                  <span className={idea.approved ? "approved-tag" : ""}>
                    {idea.approved ? "✓ ทีมตกลงใช้" : "○ กำลังเสนอ"}
                  </span>
                </span>
                <span className="playing-index bottom red">♦</span>
              </>
            ),
          }))}
        />
      ) : (
        <CardCollection
          key={`${view}:${group}:${search}`}
          mode={view === "all" ? "table" : "hand"}
          tone={
            view === "friends" ? "purple" : view === "all" ? "green" : "neutral"
          }
          allowShuffle={view === "all"}
          cards={filteredTasks.map((task) => ({
            id: task.id,
            title: task.title,
            available: !task.owner,
            onOpen: () => onOpenModal({ type: "task-detail", taskId: task.id }),
            face: (
              <>
                <span
                  className={`playing-index ${view === "friends" ? "red" : ""}`}
                >
                  {SUITS[view]}
                </span>
                <span className="playing-category">{task.category}</span>
                <span className="playing-status">{renderBadge(task)}</span>
                <h2 className="playing-title">{task.title}</h2>
                <p className="playing-description">{task.description}</p>
                <span className="playing-foot">
                  <span className="owner-label">
                    {task.owner ? (
                      renderAvatar(task.owner)
                    ) : (
                      <span className="unowned-mark">○</span>
                    )}
                    {isMine(task.owner) ? "คุณ" : memberName(task.owner)}
                  </span>
                  <span className="date-label">
                    {task.due
                      ? `ส่ง ${formatDate(task.due)}`
                      : "ไม่กำหนดวันส่ง"}
                  </span>
                </span>
                <span
                  className={`playing-index bottom ${view === "friends" ? "red" : ""}`}
                >
                  {SUITS[view]}
                </span>
              </>
            ),
          }))}
        />
      )}
    </>
  );
}
