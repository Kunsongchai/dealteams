import { RoomState, ViewType } from "../supabase";

export const VIEW_NAMES: Record<ViewType, string> = {
  overview: "โต๊ะของทีม",
  all: "งานทั้งหมด",
  mine: "งานในมือ",
  friends: "งานของเพื่อน",
  ideas: "สไตล์งาน",
};

export const SUITS: Record<ViewType, string> = {
  overview: "▤",
  all: "♣",
  mine: "♠",
  friends: "♥",
  ideas: "♦",
};

interface SidebarProps {
  room: RoomState;
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onGoHome: () => void;
}

export default function Sidebar({
  room,
  currentView,
  onSelectView,
  onGoHome,
}: SidebarProps) {
  const views = Object.entries(VIEW_NAMES) as [ViewType, string][];

  return (
    <aside id="sidebar" className="sidebar">
      <div className="sidebar-room">
        <h2>{room.name}</h2>
        <small>
          {room.code} · {room.demo ? "ห้องตัวอย่าง" : "ห้องออนไลน์"}
        </small>
      </div>

      {views.map(([view, name]) => (
        <button
          key={view}
          className={`side-link ${currentView === view ? "active" : ""}`}
          aria-current={currentView === view ? "page" : undefined}
          onClick={() => onSelectView(view)}
        >
          <span>{SUITS[view]}</span>
          {name}
        </button>
      ))}

      <div className="side-divider"></div>

      <button className="side-link home-side" onClick={onGoHome}>
        <span>↖</span>กลับหน้าแรก
      </button>
    </aside>
  );
}
