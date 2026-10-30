import { useState, useEffect, useRef, ReactNode } from "react";
import {
  CATEGORIES,
  Category,
  ModalConfig,
  RoomState,
  RecentRoom,
  Task,
  TaskFormFields,
  Idea,
} from "../supabase";
import { formatDate } from "./Workspace";

interface TaskModalProps {
  modal: ModalConfig | null;
  room: RoomState | null;
  profile: string;
  recentRooms: RecentRoom[];
  onClose: () => void;
  onOpenModal: (config: ModalConfig) => void;
  onUpdateProfile: (name: string) => Promise<void>;
  onCreateRoom: (data: { name: string; brief: string }) => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onSelectRoom: (roomId: string) => void;
  onSaveTask: (fields: TaskFormFields, existingId?: string) => Promise<void>;
  onClaimTask: (task: Task) => Promise<void>;
  onProgressTask: (task: Task) => Promise<void>;
  onToggleHelp: (task: Task) => Promise<void>;
  onAttachLink: (task: Task, link: string) => Promise<void>;
  onSaveIdea: (data: {
    title: string;
    description: string;
    link: string;
    image: string;
  }) => Promise<void>;
  onToggleApproveIdea: (idea: Idea) => Promise<void>;
}

function DrawCards({
  tasks,
  onPick,
}: {
  tasks: Task[];
  onPick: (id: string) => void;
}) {
  const deal = () => {
    const ids = tasks.filter((task) => !task.owner).map((task) => task.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, 3);
  };
  const [ids, setIds] = useState(deal);
  return (
    <>
      <div className="draw-stage">
        {ids
          .filter((id) => tasks.some((task) => task.id === id && !task.owner))
          .map((id, index) => (
            <button
              key={id}
              className="draw-card"
              aria-label={`เลือกไพ่คว่ำใบที่ ${index + 1}`}
              onClick={() => onPick(id)}
            >
              ✧
            </button>
          ))}
      </div>
      <button className="btn btn-plain" onClick={() => setIds(deal())}>
        สับไพ่
      </button>
    </>
  );
}

export default function TaskModal({
  modal,
  room,
  profile,
  recentRooms,
  onClose,
  onOpenModal,
  onUpdateProfile,
  onCreateRoom,
  onJoinRoom,
  onSelectRoom,
  onSaveTask,
  onClaimTask,
  onProgressTask,
  onToggleHelp,
  onAttachLink,
  onSaveIdea,
  onToggleApproveIdea,
}: TaskModalProps) {
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError("");
    setBusy(false);
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellRef.current?.querySelector<HTMLElement>("#dialog-title")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const targets = [
        ...(shellRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) || []),
      ];
      const first = targets[0],
        last = targets[targets.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement;
      if (
        !targets.includes(active) ||
        (event.shiftKey ? active === first : active === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [modal, busy, onClose]);

  if (!modal) return null;

  const isMine = (ownerId: string | null) =>
    Boolean(room && (ownerId === room.myMemberId || ownerId === "me"));

  const memberName = (id: string | null): string => {
    if (!id) return "ยังไม่มีคนรับ";
    if (isMine(id)) return profile;
    return room?.members.find((m) => m.id === id)?.name || "สมาชิกทีม";
  };

  const renderFooter = (submitLabel: string) => (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-plain"
          onClick={onClose}
          disabled={busy}
        >
          ยกเลิก
        </button>
        <button className="btn btn-paper" type="submit" disabled={busy}>
          {busy ? "กำลังบันทึก…" : submitLabel}
        </button>
      </div>
    </>
  );

  let title = "";
  let wide = false;
  let content: ReactNode = null;

  if (modal.type === "profile") {
    title = "ให้ทีมรู้จักคุณ";
    content = (
      <>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const name =
              new FormData(e.currentTarget).get("name")?.toString().trim() ||
              "";
            if (!name) return setError("ใส่ชื่อที่อยากให้เพื่อนเรียกก่อนนะ");
            setBusy(true);
            try {
              await onUpdateProfile(name);
            } catch (err) {
              setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ชื่อของคุณ
            <input
              name="name"
              className="input"
              required
              maxLength={25}
              defaultValue={profile}
            />
          </label>
          {renderFooter("บันทึกชื่อ")}
        </form>
      </>
    );
  } else if (modal.type === "create-room") {
    title = "เปิดโต๊ะของคุณ";
    content = (
      <>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = fd.get("name")?.toString().trim() || "";
            const brief = fd.get("brief")?.toString().trim() || "";
            if (!name) return setError("ตั้งชื่อห้องก่อนเริ่มโต๊ะใหม่");
            setBusy(true);
            try {
              await onCreateRoom({ name, brief });
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "สร้างห้องไม่สำเร็จ",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ชื่อห้อง
            <input
              name="name"
              className="input"
              required
              maxLength={50}
              placeholder="ชื่อทีมของเรา"
            />
          </label>
          <label>
            เป้าหมายสั้น ๆ ของทีม
            <textarea
              name="brief"
              className="textarea"
              maxLength={180}
              placeholder="เราจะทำอะไรให้สำเร็จด้วยกัน"
            />
          </label>
          {renderFooter("สร้างห้อง")}
        </form>
      </>
    );
  } else if (modal.type === "join-room") {
    title = "เข้าห้องด้วยรหัส";
    content = (
      <>
        <p className="dialog-intro">
          ใส่รหัส 6 หลักของห้องที่เพื่อนสร้างไว้
          <br />
        </p>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const code =
              new FormData(e.currentTarget).get("code")?.toString().trim() ||
              "";
            if (!code) return setError("กรุณากรอกรหัสห้อง");
            setBusy(true);
            try {
              await onJoinRoom(code);
            } catch (err) {
              setError(err instanceof Error ? err.message : "ไม่พบรหัสห้องนี้");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            รหัสห้อง
            <input
              name="code"
              className="input"
              required
              maxLength={8}
              placeholder="DEMO67"
              style={{ textTransform: "uppercase", letterSpacing: "3px" }}
            />
          </label>
          {renderFooter("เข้าห้อง")}
        </form>
      </>
    );
  } else if (modal.type === "about") {
    title = "เบื้องหลัง DealTeams";
    wide = true;
    content = (
      <div className="about-story">
        <section className="about-maker">
          <span className="about-maker-suit" aria-hidden="true">
            <img
              src="src/assets/Screenshot_20261016_121012.jpg"
              alt="Kunsongchai Chaiapijarean"
              className="maker-img"
            />
          </span>
          <div>
            <h3>Kunsongchai Chaiapijarean</h3>
            <p>นักศึกษาชั้นปีที่ 2 · มหาวิทยาลัยกรุงเทพ</p>
            <p>คณะ ITI · สาขาวิทยาการคอมพิวเตอร์ (Computer Science)</p>
          </div>
        </section>

        <section className="about-section">
          <h3>
            <span aria-hidden="true">♥</span> จุดเริ่มต้น
          </h3>
          <p>
            บางคนมีไอเดีย แต่ยังไม่กล้าเสนอ บางคนอยากช่วย แต่ไม่รู้จะเริ่มตรงไหน
          </p>
          <p>
            ผมก็เป็นอีกคนหนึ่งที่ไม่ค่อยกล้าเข้าหาเพื่อนใหม่ๆ เพื่อคุยเรื่องงาน
            ทั้งที่อยากมีส่วนร่วมกับทีม และอยากให้งานเสร็จ
            ผมเลยอยากสร้างพื้นที่ที่ช่วยให้การเริ่มต้นทำงานด้วยกันง่ายขึ้น
            โดยไม่ต้องรอให้ใครเป็นคนเปิดบทสนทนาก่อน
          </p>
        </section>

        <section className="about-section">
          <h3>
            <span aria-hidden="true">♣</span> ทำไมต้องเป็นโต๊ะไพ่?
          </h3>
          <p>
            ผมสร้าง DealTeams ที่มาจากคำว่า Deal
            หมายถึงการตกลงกันรับงานและอีกความหมายคือการแจกไพ่
            โดยเปลี่ยนงานกลุ่มเป็นโต๊ะไพ่เล็กๆ งานแต่ละชิ้นคือไพ่หนึ่งใบ
            และแจกไพ่(งาน) ให้ทุกคนเลือกหยิบงานที่อยากลอง รับผิดชอบในสิ่งที่ถนัด
          </p>
          <p>
            กองไพ่ของเพื่อนช่วยให้เห็นว่าแต่ละคนกำลังทำอะไร
            ส่วนกองสไตล์งานเป็นที่รวมไอเดียและภาพอ้างอิง
            เพื่อให้ทีมสร้างงานไปในทิศทางเดียวกัน
          </p>
          <p>
            สำหรับผม แนวคิด “Re:Humanize the Web”
            คือการใช้เว็บช่วยให้คนเข้าหากันได้ง่ายขึ้น
            และรู้สึกว่าตัวเองมีที่อยู่ในทีม
          </p>
        </section>

        <section className="about-section">
          <h3>
            <span aria-hidden="true">♦</span> เครื่องมือที่ใช้สร้าง
          </h3>
          <dl className="about-tools">
            <div>
              <dt>React + TypeScript</dt>
              <dd>สร้างหน้าจอและจัดการการทำงานของเว็บ</dd>
            </div>
            <div>
              <dt>CSS</dt>
              <dd>ออกแบบโต๊ะไพ่ พัดไพ่ และการพลิกไพ่</dd>
            </div>
            <div>
              <dt>Vite</dt>
              <dd>รันเว็บระหว่างพัฒนาและ build โปรเจกต์</dd>
            </div>
            <div>
              <dt>Supabase</dt>
              <dd>เก็บข้อมูลห้อง สมาชิก งาน และไอเดีย</dd>
            </div>
            <div>
              <dt>VS Code + Codex</dt>
              <dd>เขียนโค้ด โดยมี AI ช่วยพัฒนาตกแต่งและแก้บั๊ก</dd>
            </div>
          </dl>
        </section>

        <blockquote className="about-closing">
          ขอบคุณที่ให้ความสนใจ
          <br />
          <strong>ขอบคุณครับ :)</strong>
        </blockquote>
      </div>
    );
  } else if (modal.type === "rooms") {
    title = "โต๊ะที่คุณเคยเปิด";
    content = (
      <>
        <p className="dialog-intro">ห้องทั้งหมดที่บันทึกอยู่ในเบราว์เซอร์นี้</p>
        <div className="room-list">
          {recentRooms.map((r) => (
            <button key={r.id} onClick={() => onSelectRoom(r.id)}>
              <span>
                {r.name}
                <small>{r.code}</small>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  } else if (modal.type === "invite" && room) {
    title = "รหัสโต๊ะของคุณ";
    content = (
      <>
        <p className="dialog-intro">{room.name}</p>
        <b className="room-code-display">{room.code}</b>
      </>
    );
  } else if (modal.type === "guide") {
    title = "เริ่มต้นด้วยไพ่ใบเดียว";
    content = (
      <>
        <ol className="list-notes">
          <li>กองงานทั้งหมด: สร้างงาน หรือเลือกรับงานว่าง</li>
          <li>งานในมือ: อัปเดตสถานะและแนบลิงก์ผลงาน</li>
          <li>งานของเพื่อน: เลือกสมาชิกเพื่อดูความคืบหน้า</li>
          <li>สไตล์งาน: เก็บภาพอ้างอิงและปักหมุดแนวทาง</li>
        </ol>
        <p className="dialog-intro" style={{ marginTop: "18px" }}>
          ถ้ายังเลือกไม่ถูก ลองจั่วไพ่ได้ และยืนยันก่อนรับงานเสมอ
        </p>
      </>
    );
  } else if (modal.type === "draw" && room) {
    const available = room.tasks.filter((t) => !t.owner);
    if (!available.length) {
      title = "ทุกใบมีคนดูแลแล้ว";
      content = (
        <>
          <p className="dialog-intro">
            เพิ่มงานใหม่ในกองงานทั้งหมด แล้วกลับมาจั่วอีกครั้งได้เลย
          </p>
          <button
            className="btn btn-paper"
            onClick={() => onOpenModal({ type: "task-form" })}
          >
            ＋ เพิ่มไพ่งาน
          </button>
        </>
      );
    } else {
      title = "ใบไหนจะเป็นก้าวแรกของคุณ?";
      content = (
        <>
          <p className="dialog-intro">
            เลือกหนึ่งใบเพื่อเปิดดูงาน ไม่ต้องรับทันที
            <br />
            ถ้าไม่ใช่ ลองใหม่ได้เสมอ
          </p>
          <DrawCards
            tasks={room.tasks}
            onPick={(id) =>
              onOpenModal({ type: "task-detail", taskId: id, drawn: true })
            }
          />
          <p className="draw-note">
            สุ่ม {available.length} งานจากที่ยังไม่มีคนรับ
          </p>
        </>
      );
    }
  } else if (modal.type === "task-detail" && room) {
    const t = room.tasks.find((x) => x.id === modal.taskId);
    if (!t) return null;
    const own = isMine(t.owner);
    wide = true;
    title = t.title;

    content = (
      <>
        {modal.drawn && <p className="reveal-label">✧ ไพ่ที่จั่วได้</p>}
        <div className="detail-topline">
          {t.category}{" "}
          <span
            className={`status-pill ${
              t.help
                ? "help"
                : t.status === "กำลังทำ"
                  ? "working"
                  : t.status === "เสร็จแล้ว"
                    ? "done"
                    : ""
            }`}
          >
            {t.help ? "อยากให้ช่วย" : t.status}
          </span>
        </div>
        <dl className="detail-info">
          <div>
            <dt>ผู้รับผิดชอบ</dt>
            <dd>{memberName(t.owner)}</dd>
          </div>
          <div>
            <dt>กำหนดส่ง</dt>
            <dd>{formatDate(t.due)}</dd>
          </div>
        </dl>
        <section className="detail-section">
          <h3>รายละเอียดงาน</h3>
          <p className="detail-text">{t.description}</p>
        </section>
        {t.deliverable && (
          <section className="detail-section">
            <h3>ทำเสร็จเมื่อ…</h3>
            <p className="detail-text">{t.deliverable}</p>
          </section>
        )}
        {t.help && (
          <p className="help-note">♡ งานนี้ติดป้ายขอความช่วยเหลืออยู่</p>
        )}
        {t.link && (
          <section className="detail-section">
            <h3>ผลงานที่แนบ</h3>
            <a
              className="file-link"
              href={t.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              เปิดดูผลงาน <span>↗</span>
            </a>
          </section>
        )}
        <div className="detail-controls">
          {!t.owner ? (
            <button
              className="btn btn-paper"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onClaimTask(t);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "รับงานไม่สำเร็จ",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              รับงานนี้เข้ามือ
            </button>
          ) : own ? (
            <>
              <button
                className="btn btn-paper"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onProgressTask(t);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t.status === "ยังไม่เริ่ม"
                  ? "เริ่มลงมือทำ"
                  : t.status === "กำลังทำ"
                    ? "ทำเสร็จแล้ว ✓"
                    : "กลับไปทำต่อ"}
              </button>
              <button
                className="btn btn-plain"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onToggleHelp(t);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t.help ? "ได้รับความช่วยเหลือแล้ว" : "อยากให้ช่วย ♡"}
              </button>
              <button
                className="btn btn-plain"
                onClick={() =>
                  onOpenModal({ type: "attach-link", taskId: t.id })
                }
              >
                แนบผลงาน
              </button>
            </>
          ) : (
            <p className="note-inline">
              ไพ่ของเพื่อนในทีม — ดูความคืบหน้าได้จากหน้านี้
            </p>
          )}
          {modal.drawn && (
            <button
              className="btn btn-plain"
              onClick={() => onOpenModal({ type: "draw" })}
            >
              ลองจั่วใหม่
            </button>
          )}
          {(own || !t.owner) && (
            <button
              className="btn btn-plain"
              onClick={() => onOpenModal({ type: "task-form", taskId: t.id })}
            >
              แก้รายละเอียด
            </button>
          )}
        </div>
      </>
    );
  } else if (modal.type === "task-form" && room) {
    const t = room.tasks.find((x) => x.id === modal.taskId);
    title = t ? "ปรับรายละเอียดไพ่" : "เพิ่มไพ่ใบใหม่";
    content = (
      <>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const rawCategory = (fd.get("category")?.toString() ||
              "ออกแบบ") as Category;
            const fields: TaskFormFields = {
              title: fd.get("title")?.toString().trim() || "",
              category: CATEGORIES.includes(rawCategory)
                ? rawCategory
                : "ออกแบบ",
              due: fd.get("due")?.toString() || "",
              description: fd.get("description")?.toString().trim() || "",
              deliverable: fd.get("deliverable")?.toString().trim() || "",
              owner: fd.get("owner")?.toString() || "",
            };
            if (!fields.title || !fields.description)
              return setError("ใส่ชื่องานและรายละเอียดให้ครบ");
            setBusy(true);
            try {
              await onSaveTask(fields, t?.id || "");
            } catch (err) {
              setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ชื่องาน
            <input
              className="input"
              name="title"
              required
              maxLength={80}
              defaultValue={t?.title || ""}
              placeholder="เช่น ออกแบบหน้าแรกของเว็บไซต์"
            />
          </label>
          <div className="form-row">
            <label>
              กองงาน
              <select
                className="select"
                name="category"
                defaultValue={t?.category || CATEGORIES[0]}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              กำหนดส่ง (ไม่บังคับ)
              <input
                className="input"
                type="date"
                name="due"
                defaultValue={t?.due || ""}
              />
            </label>
          </div>
          <label>
            รายละเอียด
            <textarea
              className="textarea"
              name="description"
              required
              maxLength={1000}
              defaultValue={t?.description || ""}
              placeholder="งานนี้ต้องทำอะไรบ้าง"
            />
          </label>
          <label>
            ทำเสร็จเมื่อ…
            <input
              className="input"
              name="deliverable"
              maxLength={200}
              defaultValue={t?.deliverable || ""}
              placeholder="เช่น ภาพร่าง 1 หน้า พร้อมเวอร์ชันมือถือ"
            />
          </label>
          {!t && (
            <label>
              ผู้รับผิดชอบ
              <select className="select" name="owner" defaultValue="">
                <option value="">ให้คนในทีมเลือก</option>
                <option value="me">รับงานนี้เอง</option>
              </select>
            </label>
          )}
          {renderFooter(t ? "บันทึกการแก้ไข" : "เพิ่มไพ่เข้ากอง ＋")}
        </form>
      </>
    );
  } else if (modal.type === "attach-link" && room) {
    const t = room.tasks.find((x) => x.id === modal.taskId);
    if (!t) return null;
    title = "แนบผลงาน";
    content = (
      <>
        <p className="dialog-intro">{t.title}</p>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const rawLink =
              new FormData(e.currentTarget).get("link")?.toString().trim() ||
              "";
            if (!rawLink || !/^https?:\/\//i.test(rawLink)) {
              return setError("ใช้ลิงก์ที่ขึ้นต้นด้วย https:// หรือ http://");
            }
            setBusy(true);
            try {
              await onAttachLink(t, rawLink);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "แนบลิงก์ไม่สำเร็จ",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ลิงก์ผลงาน
            <input
              className="input"
              name="link"
              type="url"
              required
              defaultValue={t.link || ""}
              placeholder="https://..."
            />
          </label>
          <small>
            ใช้ลิงก์ Google Drive, Figma หรืออื่นๆ ที่เปิดดูผลงานได้
          </small>
          {renderFooter("บันทึกลิงก์")}
        </form>
      </>
    );
  } else if (modal.type === "idea-detail" && room) {
    const i = room.ideas.find((x) => x.id === modal.ideaId);
    if (!i) return null;
    title = i.title;
    content = (
      <>
        <p className="dialog-intro">
          ♦ {i.category} · {i.approved ? "ทีมตกลงใช้" : "กำลังเสนอ"}
        </p>
        {i.image && (
          <img className="detail-image" src={i.image} alt={i.title} />
        )}
        <p className="detail-text">{i.description}</p>
        {i.link && (
          <p style={{ marginTop: "18px" }}>
            <a
              className="link-inline"
              href={i.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              เปิดลิงก์อ้างอิง
            </a>
          </p>
        )}
        <div className="detail-controls">
          <button
            className="btn btn-paper"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onToggleApproveIdea(i);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "อัปเดตไอเดียไม่สำเร็จ",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {i.approved ? "ถอดหมุด" : "ปักหมุด"}
          </button>
        </div>
      </>
    );
  } else if (modal.type === "idea-form" && room) {
    title = "ฝากไอเดียให้ทีม";
    content = (
      <>
        <form
          className="modal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const ideaTitle = fd.get("title")?.toString().trim() || "";
            const description = fd.get("description")?.toString().trim() || "";
            const link = fd.get("link")?.toString().trim() || "";
            if (!ideaTitle || !description)
              return setError("ใส่ชื่อและสิ่งที่อยากให้ทีมรู้");
            if (link && !/^https?:\/\//i.test(link))
              return setError("ลิงก์ต้องขึ้นต้นด้วย https:// หรือ http://");
            setBusy(true);
            try {
              await onSaveIdea({
                title: ideaTitle,
                description,
                link,
                image: "",
              });
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "บันทึกไอเดียไม่สำเร็จ",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ชื่อไอเดีย
            <input
              name="title"
              className="input"
              required
              maxLength={80}
              placeholder="เช่น ตัวอย่างการจัดวางหน้าแรก"
            />
          </label>
          <label>
            สิ่งที่อยากให้ทีมรู้
            <textarea
              name="description"
              className="textarea"
              required
              maxLength={1000}
              placeholder="อยากแนะนำอะไรให้ทีมรู้บ้าง เช่น โทนสีที่อยากให้ใช้ หรือข้อสังเกตเล็กๆ"
            />
          </label>
          <label>
            ลิงก์อ้างอิง
            <input
              type="url"
              name="link"
              className="input"
              placeholder="https://..."
            />
          </label>
          {renderFooter("เพิ่มลงกองไอเดีย")}
        </form>
      </>
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        ref={shellRef}
        className={`modal-shell ${wide ? "wide" : ""} ${["task-detail", "idea-detail"].includes(modal.type) ? "card-detail-shell" : ""}`}
      >
        <div className={`modal-box ${wide ? "wide" : ""}`}>
          <button className="dialog-close" onClick={onClose} disabled={busy}>
            ✕
          </button>
          <h2 id="dialog-title" tabIndex={-1}>
            {title}
          </h2>
          {content}
          {error &&
            ![
              "profile",
              "create-room",
              "join-room",
              "task-form",
              "attach-link",
              "idea-form",
            ].includes(modal.type) && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
        </div>
      </div>
      <div
        className="backdrop"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
    </div>
  );
}
