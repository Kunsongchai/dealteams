import { ModalType, RecentRoom } from "../supabase";

interface HomeProps {
  lastRoom?: RecentRoom;
  onAction: (type: ModalType) => void;
  onOpenRoom: (roomId: string) => void;
}

export default function Home({ lastRoom, onAction, onOpenRoom }: HomeProps) {
  const entries: [string, string, string, string, string, ModalType][] = [
    [
      "♠",
      "สร้าง",
      "ห้องใหม่",
      "ช่วนเพื่อนของคุณ",
      "มาอยู่บนโต๊ะเดียวกัน",
      "create-room",
    ],
    [
      "♥",
      "เข้าร่วม",
      "ห้อง",
      "เพื่อนสร้างให้?",
      "เข้าก่อนได้เลือกที่นั่งก่อน",
      "join-room",
    ],
    [
      "♣",
      "ชื่อของ",
      "คุณ",
      "ให้ทีมรู้จักคุณ",
      "ระวังเพื่อนจำไม่ได้นะ",
      "profile",
    ],
    ["♦", "เรื่องราว", "ของเรา", "ต้นกำเนิด", "ให้เราได้ทำงานด้วยกัน", "about"],
  ];

  return (
    <>
      <section className="welcome">
        <h1>
          กลุ่มที่ดี เริ่มจาก
          <br />
          <em>ทุกคนมีไพ่ในมือ</em>
        </h1>
        <p>
          เว็ปสำหรับทีมที่อยากเริ่มงานกลุ่ม
          <br />
          แค่เลือกไพ่ใบแรก
        </p>
      </section>

      <section className="fan-wrap">
        <div className="home-fan">
          {entries.map(([suit, title1, title2, desc1, desc2, action], i) => (
            <button
              key={action}
              className="entry-card"
              onClick={() => onAction(action)}
            >
              <span
                className={`card-corner ${i % 2 ? "red" : ""}`}
                aria-hidden="true"
              >
                {suit}
              </span>
              <h2>
                {title1}
                <br />
                {title2}
              </h2>
              <p>
                {desc1}
                <br />
                {desc2}
              </p>
              <span
                className={`card-corner bottom ${i % 2 ? "red" : ""}`}
                aria-hidden="true"
              >
                {suit}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="resume-panel">
          <div className="small-heading">
            <h2>{lastRoom?.demo ? "โต๊ะตัวอย่าง" : "กลับไปทำต่อ"}</h2>
          </div>
          {lastRoom && (
            <button
              className="resume-row"
              onClick={() => onOpenRoom(lastRoom.id)}
            >
              <span className="resume-icon">♣</span>
              <span className="resume-info">
                <b>{lastRoom.name}</b>
                <small>
                  รหัสห้อง {lastRoom.code} ·{" "}
                  {lastRoom.demo ? "โต๊ะตัวอย่าง" : "ซิงก์ออนไลน์"}
                </small>
              </span>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
