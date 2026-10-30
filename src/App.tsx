// src/App.tsx
import { useState, useEffect, useCallback } from "react";
import { db, packTaskDetail, STATUS_TO_DB } from "./supabase";
import type {
  RoomState,
  RecentRoom,
  ModalConfig,
  ModalType,
  ViewType,
  Task,
  TaskFormFields,
  Idea,
  DbRoom,
  DbTask,
  DbIdea,
} from "./supabase";
import Home from "./components/Home.tsx";
import Sidebar from "./components/Sidebar.tsx";
import Workspace from "./components/Workspace.tsx";
import TaskModal from "./components/TaskModal.tsx";
import "./style.css";
import "./card-collections.css";

const STORAGE_KEY = "dealteams-react-ts-v1";

const dateKey = (offset = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DEMO_ROOM: RoomState = {
  id: "demo",
  name: "ห้องตัวอย่าง",
  code: "DEMO67",
  brief: "ห้องสำหรับโชว์ตัวอย่างการใช้งาน DealTeams",
  demo: true,
  myMemberId: "me",
  members: [
    { id: "me", name: "คุณ", role: "ทำเว็ป", color: "#d6e2bf" },
    { id: "mind", name: "มายด์", role: "ตัดต่อ", color: "#ecd1bf" },
    { id: "pete", name: "พีท", role: "เขียนบท", color: "#d2ddcf" },
    { id: "nut", name: "นัท", role: "นำเสนอ", color: "#ded6b7" },
  ],
  tasks: [
    {
      id: "t1",
      title: "ออกแบบหน้าแรกของเว็บไซต์",
      category: "ออกแบบ",
      owner: "me",
      status: "กำลังทำ",
      description:
        "จัดวางเนื้อหาหน้าแรกให้เห็นว่าโปรเจกต์นี้ช่วยใคร ใช้โทนสีและตัวอักษรจากกองสไตล์งาน",
      deliverable: "ภาพร่างหน้าแรก 1 หน้า พร้อมตัวอย่างบนมือถือ",
      due: dateKey(1),
      help: false,
      link: "",
    },
    {
      id: "t2",
      title: "เขียนข้อความแนะนำโปรเจกต์",
      category: "หาข้อมูล",
      owner: "me",
      status: "ยังไม่เริ่ม",
      description:
        "เล่าปัญหาที่ทีมอยากแก้ และเหตุผลที่เราอยากทำเว็บไซต์นี้ ใช้ภาษาที่อ่านง่ายและเป็นกันเอง",
      deliverable: "ข้อความแนะนำ 1 ย่อหน้า ไม่เกิน 150 คำ",
      due: dateKey(2),
      help: false,
      link: "",
    },
    {
      id: "t3",
      title: "สร้างฟอร์มเข้าร่วมห้อง",
      category: "สร้างสรรค์",
      owner: "pete",
      status: "กำลังทำ",
      description:
        "เตรียมช่องชื่อเล่นและรหัสห้อง พร้อมข้อความอธิบายเมื่อกรอกข้อมูลไม่ครบ",
      deliverable: "หน้า HTML ที่ทดสอบการกรอกฟอร์มได้",
      due: dateKey(2),
      help: true,
      link: "",
    },
    {
      id: "t4",
      title: "รวบรวมภาพอ้างอิง",
      category: "ออกแบบ",
      owner: "mind",
      status: "เสร็จแล้ว",
      description: "รวบรวมแนวทางหน้าตาเว็บที่ช่วยให้คนใหม่รู้สึกอยากร่วมทีม",
      deliverable: "เรฟ 3 แบบ พร้อมเหตุผลที่เลือก",
      due: dateKey(0),
      help: false,
      link: "",
    },
    {
      id: "t5",
      title: "ออกแบบไอคอนประจำกอง",
      category: "ออกแบบ",
      owner: null,
      status: "ยังไม่เริ่ม",
      description:
        "ใช้ดอกไพ่ทั้ง 4 เป็นสัญลักษณ์ของแต่ละหมวด ปรับขนาดและสีให้เห็นได้ชัดบนมือถือ",
      deliverable: "ไอคอน 4 แบบที่ดูเป็นชุดเดียวกัน",
      due: dateKey(3),
      help: false,
      link: "",
    },
  ],
  ideas: [
    {
      id: "i1",
      title: "โทนสีของทีม",
      category: "สีและบรรยากาศ",
      description:
        "พื้นชาร์โคลช่วยให้ไพ่เด่นขึ้น ใช้เขียวโต๊ะไพ่เพื่อสร้างพื้นที่ร่วมกัน และครีมอุ่นสำหรับเนื้อหาที่อ่านนาน",
      kind: "palette",
      approved: true,
      image: "",
      link: "",
    },
    {
      id: "i2",
      title: "อ่านง่าย และเป็นกันเอง",
      category: "ตัวอักษร",
      description:
        "ใช้ IBM Plex Sans Thai สำหรับภาษาไทยและ Manrope สำหรับภาษาอังกฤษ หัวเรื่องสั้นชัด เว้นบรรทัดให้สบายตา",
      kind: "type",
      approved: true,
      image: "",
      link: "",
    },
  ],
  activity: [{ text: "เปิดโต๊ะตัวอย่าง", time: Date.now() }],
};

interface SavedStorage {
  profile: string;
  lastRoomId: string;
  memberMap: Record<string, string>;
  recentRooms: RecentRoom[];
  demoRoom: RoomState;
}

interface RouteState {
  roomId: string | null;
  view: "home" | ViewType;
  group: string;
}

export default function App() {
  const [saved, setSaved] = useState<SavedStorage>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
      if (raw && typeof raw.profile === "string") return raw as SavedStorage;
    } catch {}
    return {
      profile: "เพื่อนใหม่",
      lastRoomId: "demo",
      memberMap: {},
      recentRooms: [
        { id: "demo", name: "ห้องตัวอย่าง", code: "DEMO67", demo: true },
      ],
      demoRoom: DEMO_ROOM,
    };
  });

  const [route, setRoute] = useState<RouteState>({
    roomId: null,
    view: "home",
    group: "",
  });
  const [roomData, setRoomData] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [toastMsg, setToastMsg] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);

  const showToast = useCallback((text: string) => {
    setToastMsg(text);
    const timer = setTimeout(() => setToastMsg(""), 4000);
    return () => clearTimeout(timer);
  }, []);

  const loadOnlineRoom = useCallback(
    async (roomId: string, silent = false, knownMemberId?: string) => {
      if (roomId === "demo") {
        setRoomData(saved.demoRoom || DEMO_ROOM);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const data = await db.loadRoom(roomId);
        let myMemberId = knownMemberId ?? saved.memberMap[roomId];
        const member = await db.ensureMember(roomId, myMemberId, saved.profile);
        myMemberId = member.id;

        setSaved((prev) => ({
          ...prev,
          lastRoomId: roomId,
          memberMap: { ...prev.memberMap, [roomId]: myMemberId },
          recentRooms: [
            {
              id: data.room.id,
              name: data.room.name,
              code: data.room.code,
              demo: false,
            },
            ...prev.recentRooms.filter((r) => r.id !== data.room.id),
          ].slice(0, 10),
        }));

        const membersList = data.members.some((m) => m.id === myMemberId)
          ? data.members
          : [
              ...data.members,
              {
                id: myMemberId,
                name: member.name,
                role: "สมาชิกของทีม",
                color: "#d6e2bf",
              },
            ];

        setRoomData({
          id: data.room.id,
          name: data.room.name,
          code: data.room.code,
          brief: "พื้นที่เล็กๆ สำหรับงานที่เราจะทำด้วยกัน",
          demo: false,
          myMemberId,
          members: membersList,
          tasks: data.tasks,
          ideas: data.ideas,
          activity: [
            {
              text: `ซิงก์ข้อมูลล่าสุดของโต๊ะ “${data.room.name}”`,
              time: Date.now(),
            },
          ],
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "โหลดข้อมูลห้องไม่สำเร็จ";
        showToast(message);
        setRoute({ roomId: null, view: "home", group: "" });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [saved.demoRoom, saved.memberMap, saved.profile, showToast],
  );

  const openRoom = (
    roomId: string,
    view: ViewType = "overview",
    group = "",
  ) => {
    setRoute({ roomId, view, group });
    if (roomId === "demo") {
      setRoomData(saved.demoRoom || DEMO_ROOM);
    } else {
      loadOnlineRoom(roomId);
    }
  };

  const mutateDemo = (updater: (demo: RoomState) => void) => {
    setSaved((prev) => {
      const nextDemo = structuredClone(prev.demoRoom || DEMO_ROOM);
      updater(nextDemo);
      setRoomData(nextDemo);
      return { ...prev, demoRoom: nextDemo };
    });
  };

  const handleUpdateProfile = async (newName: string) => {
    setSaved((prev) => ({ ...prev, profile: newName }));
    if (roomData && !roomData.demo && roomData.myMemberId) {
      try {
        await db.updateMemberName(roomData.myMemberId, newName);
        await loadOnlineRoom(roomData.id, true);
      } catch {}
    }
    setModal(null);
    showToast(`ยินดีที่ได้รู้จัก ${newName} ♣`);
  };

  const handleCreateRoom = async ({
    name,
  }: {
    name: string;
    brief: string;
  }) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (n) => alphabet[n % alphabet.length],
    ).join("");
    const roomId = crypto.randomUUID();
    const room = await db.insert<DbRoom>("rooms", { id: roomId, name, code });
    const member = await db.ensureMember(room.id, undefined, saved.profile);

    setSaved((prev) => ({
      ...prev,
      lastRoomId: room.id,
      memberMap: { ...prev.memberMap, [room.id]: member.id },
      recentRooms: [
        { id: room.id, name: room.name, code: room.code, demo: false },
        ...prev.recentRooms,
      ],
    }));
    setModal(null);
    // setSaved is asynchronous: pass the newly created ID directly so this
    // first load reuses the creator instead of inserting another member.
    setRoute({ roomId: room.id, view: "overview", group: "" });
    await loadOnlineRoom(room.id, false, member.id);
    showToast(`สร้างห้อง “${room.name}” เรียบร้อยแล้ว ♣`);
  };

  const handleJoinRoom = async (codeInput: string) => {
    const code = codeInput.toUpperCase();
    if (code === "DEMO67") {
      setModal(null);
      openRoom("demo", "overview");
      return;
    }
    const room = await db.findRoom("code", code);
    if (!room)
      throw new Error("ไม่พบรหัสห้องนี้ กรุณาตรวจรหัสอีกครั้ง หรือลอง DEMO67");
    setModal(null);
    openRoom(room.id, "overview");
    showToast(`เข้าร่วมโต๊ะ “${room.name}” แล้ว`);
  };

  const handleSaveTask = async (
    taskFields: TaskFormFields,
    existingId = "",
  ) => {
    if (!roomData) return;
    if (roomData.demo) {
      mutateDemo((demo) => {
        if (existingId) {
          const t = demo.tasks.find((x) => x.id === existingId);
          if (t) {
            t.title = taskFields.title;
            t.category = taskFields.category;
            t.due = taskFields.due;
            t.description = taskFields.description;
            t.deliverable = taskFields.deliverable;
          }
        } else {
          demo.tasks.push({
            id: crypto.randomUUID(),
            title: taskFields.title,
            category: taskFields.category,
            due: taskFields.due,
            description: taskFields.description,
            deliverable: taskFields.deliverable,
            owner: taskFields.owner === "me" ? "me" : null,
            status: "ยังไม่เริ่ม",
            help: false,
            link: "",
          });
        }
      });
      setModal(null);
      showToast(existingId ? "บันทึกรายละเอียด" : "เพิ่มไพ่ใบใหม่แล้ว");
      return;
    }

    const detail = packTaskDetail(taskFields);
    if (existingId) {
      await db.updateTask(roomData.id, existingId, {
        title: taskFields.title,
        detail,
      });
    } else {
      await db.insert<DbTask>("tasks", {
        id: crypto.randomUUID(),
        room_id: roomData.id,
        title: taskFields.title,
        detail,
        status: "todo",
        owner_id: taskFields.owner === "me" ? roomData.myMemberId : null,
      });
    }
    await loadOnlineRoom(roomData.id, true);
    setModal(null);
    showToast(existingId ? "บันทึกรายละเอียด" : "เพิ่มไพ่ใบใหม่แล้ว");
  };

  const handleClaimTask = async (task: Task) => {
    if (!roomData) return;
    if (roomData.demo) {
      mutateDemo((demo) => {
        const t = demo.tasks.find((x) => x.id === task.id);
        if (t) t.owner = "me";
      });
      showToast("รับไพ่เข้ามือแล้ว เริ่มได้เลย!");
      return;
    }
    await db.updateTask(roomData.id, task.id, {
      owner_id: roomData.myMemberId,
    });
    await loadOnlineRoom(roomData.id, true);
    showToast("รับไพ่เข้ามือแล้ว เริ่มได้เลย!");
  };

  const handleProgressTask = async (task: Task) => {
    if (!roomData) return;
    const nextLabel =
      task.status === "ยังไม่เริ่ม"
        ? "กำลังทำ"
        : task.status === "กำลังทำ"
          ? "เสร็จแล้ว"
          : "กำลังทำ";
    const nextHelp = nextLabel === "เสร็จแล้ว" ? false : task.help;

    if (roomData.demo) {
      mutateDemo((demo) => {
        const t = demo.tasks.find((x) => x.id === task.id);
        if (t) {
          t.status = nextLabel;
          t.help = nextHelp;
        }
      });
      showToast("อัปเดตสถานะแล้ว");
      return;
    }

    await db.updateTask(roomData.id, task.id, {
      status: STATUS_TO_DB[nextLabel],
      detail: packTaskDetail({ ...task, help: nextHelp }),
    });
    await loadOnlineRoom(roomData.id, true);
    showToast("อัปเดตสถานะแล้ว");
  };

  const handleToggleHelp = async (task: Task) => {
    if (!roomData) return;
    const nextHelp = !task.help;
    if (roomData.demo) {
      mutateDemo((demo) => {
        const t = demo.tasks.find((x) => x.id === task.id);
        if (t) t.help = nextHelp;
      });
      return;
    }
    await db.updateTask(roomData.id, task.id, {
      detail: packTaskDetail({ ...task, help: nextHelp }),
    });
    await loadOnlineRoom(roomData.id, true);
  };

  const handleAttachLink = async (task: Task, link: string) => {
    if (!roomData) return;
    if (roomData.demo) {
      mutateDemo((demo) => {
        const t = demo.tasks.find((x) => x.id === task.id);
        if (t) t.link = link;
      });
      setModal({ type: "task-detail", taskId: task.id });
      showToast("แนบลิงก์ผลงานแล้ว");
      return;
    }
    await db.updateTask(roomData.id, task.id, {
      detail: packTaskDetail({ ...task, link }),
    });
    await loadOnlineRoom(roomData.id, true);
    setModal({ type: "task-detail", taskId: task.id });
    showToast("แนบลิงก์ผลงานแล้ว");
  };

  const handleSaveIdea = async ({
    title,
    description,
    link,
    image,
  }: {
    title: string;
    description: string;
    link: string;
    image: string;
  }) => {
    if (!roomData) return;
    if (roomData.demo) {
      mutateDemo((demo) => {
        demo.ideas.unshift({
          id: crypto.randomUUID(),
          title,
          description,
          category: image ? "ภาพอ้างอิง" : link ? "ลิงก์อ้างอิง" : "ไอเดีย",
          kind: "note",
          approved: false,
          image,
          link,
        });
      });
      setModal(null);
      showToast("เพิ่มไอเดียลงกองแล้ว ♦");
      return;
    }
    await db.insert<DbIdea>("ideas", {
      id: crypto.randomUUID(),
      room_id: roomData.id,
      author_id: roomData.myMemberId,
      title,
      detail: description,
      reference_url: link || null,
      image_data: image || null,
      approved: false,
    });
    await loadOnlineRoom(roomData.id, true);
    setModal(null);
    showToast("เพิ่มไอเดียลงกองแล้ว ♦");
  };

  const handleToggleApproveIdea = async (idea: Idea) => {
    if (!roomData) return;
    if (roomData.demo) {
      mutateDemo((demo) => {
        const i = demo.ideas.find((x) => x.id === idea.id);
        if (i) i.approved = !i.approved;
      });
      showToast("อัปเดตกองสไตล์งานแล้ว");
      return;
    }
    await db.updateIdea(roomData.id, idea.id, { approved: !idea.approved });
    await loadOnlineRoom(roomData.id, true);
    showToast("อัปเดตกองสไตล์งานแล้ว");
  };

  const isHome = route.view === "home" || !roomData;
  const lastRoom =
    saved.recentRooms.find((r) => r.id === saved.lastRoomId) ||
    saved.recentRooms[0];

  return (
    <>
      <header className="app-header">
        <a
          className="wordmark"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setRoute({ roomId: null, view: "home", group: "" });
          }}
        >
          <span className="logo-cards">
            <i></i>
            <i>♠</i>
          </span>
          Deal<span>Teams</span>
        </a>
        <nav className="header-nav">
          <button onClick={() => setModal({ type: "create-room" })}>
            สร้างห้อง
          </button>
          <button onClick={() => setModal({ type: "join-room" })}>
            เข้าร่วมห้อง
          </button>
        </nav>
        <button
          className="profile-button"
          onClick={() => setModal({ type: "profile" })}
        >
          <span className="profile-copy">
            <b>{saved.profile}</b>
            <small>แก้ไขชื่อ</small>
          </span>
          <span className="avatar-circle">{saved.profile.slice(0, 1)}</span>
        </button>
      </header>

      <div id="layout" className={isHome ? "" : "work-layout"}>
        {!isHome && roomData && route.view !== "home" && (
          <Sidebar
            room={roomData}
            currentView={route.view}
            onSelectView={(view: ViewType) =>
              setRoute({ roomId: roomData.id, view, group: "" })
            }
            onGoHome={() => setRoute({ roomId: null, view: "home", group: "" })}
          />
        )}
        <main
          id="main-content"
          className={isHome ? "home" : "workspace"}
          tabIndex={-1}
        >
          {loading ? (
            <div className="empty-state">
              <span>♣</span>
              <h2>กำลังจัดโต๊ะไพ่…</h2>
              <p>รอสักครู่ ระบบกำลังดึงข้อมูล</p>
            </div>
          ) : isHome || !roomData || route.view === "home" ? (
            <Home
              lastRoom={lastRoom}
              onAction={(type: ModalType) => setModal({ type })}
              onOpenRoom={(id: string) => openRoom(id, "overview")}
            />
          ) : (
            <Workspace
              room={roomData}
              profile={saved.profile}
              view={route.view}
              group={route.group}
              onNavigate={(view: ViewType, group = "") =>
                setRoute({ roomId: roomData.id, view, group })
              }
              onGoHome={() =>
                setRoute({ roomId: null, view: "home", group: "" })
              }
              onRefresh={() => loadOnlineRoom(roomData.id)}
              onOpenModal={(modalConfig: ModalConfig) => setModal(modalConfig)}
            />
          )}
        </main>
      </div>

      <footer className="app-footer">
        <span>
          ♠ ♥ ♣ ♦ &nbsp; <b>DealTeams</b>
        </span>
        <button onClick={() => setModal({ type: "about" })}>
          เรื่องราวของเรา ↗
        </button>
      </footer>

      <TaskModal
        modal={modal}
        room={roomData}
        profile={saved.profile}
        recentRooms={saved.recentRooms}
        onClose={() => setModal(null)}
        onOpenModal={(m: ModalConfig) => setModal(m)}
        onUpdateProfile={handleUpdateProfile}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onSelectRoom={(id: string) => {
          setModal(null);
          openRoom(id, "overview");
        }}
        onSaveTask={handleSaveTask}
        onClaimTask={handleClaimTask}
        onProgressTask={handleProgressTask}
        onToggleHelp={handleToggleHelp}
        onAttachLink={handleAttachLink}
        onSaveIdea={handleSaveIdea}
        onToggleApproveIdea={handleToggleApproveIdea}
      />

      {toastMsg && (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </>
  );
}
