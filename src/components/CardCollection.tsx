import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface CollectionCard {
  id: string;
  title: string;
  face: ReactNode;
  available?: boolean;
  onOpen: () => void;
}

interface Props {
  cards: CollectionCard[];
  mode: "hand" | "table" | "stacks";
  tone: "neutral" | "green" | "purple" | "orange";
  allowShuffle?: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function CardCollection({
  cards,
  mode,
  tone,
  allowShuffle = false,
}: Props) {
  const [page, setPage] = useState(0);
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [shuffleRound, setShuffleRound] = useState(0);
  const pageSize = mode === "hand" ? 5 : 12;
  const displayed = shuffledIds
    ? shuffledIds
        .map((id) => cards.find((card) => card.id === id && card.available))
        .filter((card): card is CollectionCard => Boolean(card))
    : cards;
  const pages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = displayed.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  const available = cards.filter((card) => card.available);
  const isShuffled = shuffledIds !== null;

  return (
    <section className={`card-scene scene-${tone} scene-${mode}`}>
      <div className="scene-toolbar">
        <div>
          <span className="scene-overline">
            {isShuffled
              ? "TAKE A CHANCE"
              : mode === "hand"
                ? "YOUR HAND. YOUR NEXT STEP."
                : mode === "stacks"
                  ? "EVERY PLAYER HAS A HAND"
                  : "A PLACE FOR EVERY CARD"}
          </span>
          <p aria-live="polite">
            {isShuffled ? (
              "ไพ่คว่ำเป็นงานที่ยังไม่มีคนรับ"
            ) : mode === "hand" ? (
              <>
                <span className="hand-hint-mobile">
                  ปัดซ้าย–ขวาเพื่อดูไพ่ · แตะไพ่เพื่อเปิดรายละเอียด
                </span>
              </>
            ) : mode === "stacks" ? (
              "เลือกกองของเพื่อน เพื่อดูไพ่ในมือของเขา"
            ) : (
              "เลือกไพ่บนโต๊ะเพื่ออ่านรายละเอียดและรับงาน"
            )}
          </p>
        </div>
        {allowShuffle && (
          <div className="scene-actions">
            {isShuffled && (
              <button
                className="btn btn-soft-custom"
                onClick={() => {
                  setShuffledIds(null);
                  setRevealed([]);
                  setPage(0);
                }}
              >
                กลับไปดูงานทั้งหมด
              </button>
            )}
            <button
              className="btn btn-soft-custom"
              disabled={!available.length}
              onClick={() => {
                setShuffledIds(shuffle(available.map((card) => card.id)));
                setRevealed([]);
                setPage(0);
                setShuffleRound((round) => round + 1);
              }}
            >
              ↝{" "}
              {isShuffled
                ? "สับไพ่อีกครั้ง"
                : `คว่ำแล้วสับไพ่ (${available.length})`}
            </button>
          </div>
        )}
      </div>

      {visible.length ? (
        <div className="card-scene-scroll" key={`${safePage}:${shuffleRound}`}>
          <div
            className={`collection-${mode}`}
            style={{ "--card-count": visible.length } as CSSProperties}
          >
            {visible.map((card, index) => {
              const offset = index - (visible.length - 1) / 2;
              const facedown = isShuffled && !revealed.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`collection-card ${facedown ? "is-facedown" : "is-faceup"}`}
                  style={
                    {
                      "--card-index": index,
                      "--card-angle": `${offset * 7}deg`,
                      "--card-arc": `${Math.abs(offset) ** 2 * 9}px`,
                      "--table-tilt": `${[-2, 1.5, -1, 2][index % 4]}deg`,
                    } as CSSProperties
                  }
                  onClick={() => {
                    if (facedown) setRevealed((ids) => [...ids, card.id]);
                    else card.onOpen();
                  }}
                >
                  <span className="collection-card-turn">
                    <span
                      className="collection-card-front"
                      aria-hidden={facedown}
                    >
                      {card.face}
                    </span>
                    <span
                      className="collection-card-back"
                      aria-hidden={!facedown}
                    >
                      <span className="back-corner">✧</span>
                      <span className="back-emblem">
                        ♣<small>DEALTEAMS</small>
                      </span>
                      <span className="back-corner bottom">✧</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span>♣</span>
          <h2>ทุกใบมีคนรับแล้ว</h2>
          <p>กลับไปดูกองงาน หรือเพิ่มไพ่ใบใหม่ได้เลย</p>
        </div>
      )}

      <div className="scene-footer">
        {pages > 1 && (
          <div className="hand-pagination">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              ←
            </button>
            <span aria-live="polite">
              ชุด {safePage + 1} / {pages}
            </span>
            <button
              disabled={safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
