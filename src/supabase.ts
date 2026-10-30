const SUPABASE_URL = "https://jzckoymoyblhmyqyvkna.supabase.co";
const SUPABASE_KEY = "sb_publishable_G7cf4s23X9dUBGu7gVTIgA_6qQACy86";

export type Category = "ออกแบบ" | "สร้างสรรค์" | "หาข้อมูล";
export type DbTaskStatus = "todo" | "doing" | "done";
export type TaskStatusLabel = "ยังไม่เริ่ม" | "กำลังทำ" | "เสร็จแล้ว";
export type ViewType = "overview" | "all" | "mine" | "friends" | "ideas";

export type ModalType =
  | "profile"
  | "create-room"
  | "join-room"
  | "about"
  | "rooms"
  | "invite"
  | "guide"
  | "draw"
  | "task-detail"
  | "task-form"
  | "attach-link"
  | "idea-detail"
  | "idea-form";

export interface ModalConfig {
  type: ModalType;
  taskId?: string;
  ideaId?: string;
  drawn?: boolean;
}

export interface DbRoom {
  id: string;
  name: string;
  code: string;
}

export interface DbMember {
  id: string;
  name: string;
  room_id: string;
}

export interface DbTask {
  id: string;
  title: string;
  detail: string | null;
  status: DbTaskStatus;
  owner_id: string | null;
  room_id: string;
}

export interface DbIdea {
  id: string;
  room_id: string;
  author_id: string | null;
  title: string;
  detail: string;
  reference_url: string | null;
  image_data: string | null;
  approved: boolean;
  created_at?: string;
}

export interface Member {
  id: string;
  name: string;
  room_id?: string;
  role: string;
  color: string;
}

export interface Task {
  id: string;
  room_id?: string;
  title: string;
  category: Category;
  owner: string | null;
  status: TaskStatusLabel;
  description: string;
  deliverable: string;
  due: string;
  help: boolean;
  link: string;
}

export interface TaskFormFields {
  title: string;
  category: Category;
  due: string;
  description: string;
  deliverable: string;
  owner?: string;
}

export interface Idea {
  id: string;
  room_id?: string;
  author?: string | null;
  title: string;
  category: string;
  description: string;
  kind: "palette" | "type" | "note";
  approved: boolean;
  image: string;
  link: string;
}

export interface RoomState {
  id: string;
  name: string;
  code: string;
  brief: string;
  demo: boolean;
  myMemberId: string;
  members: Member[];
  tasks: Task[];
  ideas: Idea[];
  activity: { text: string; time: number }[];
}

export interface RecentRoom {
  id: string;
  name: string;
  code: string;
  demo: boolean;
}

export const CATEGORIES: Category[] = ["ออกแบบ", "สร้างสรรค์", "หาข้อมูล"];

export const STATUS_LABELS: Record<DbTaskStatus, TaskStatusLabel> = {
  todo: "ยังไม่เริ่ม",
  doing: "กำลังทำ",
  done: "เสร็จแล้ว",
};

export const STATUS_TO_DB: Record<TaskStatusLabel, DbTaskStatus> = {
  ยังไม่เริ่ม: "todo",
  กำลังทำ: "doing",
  เสร็จแล้ว: "done",
};

const AVATAR_COLORS = ["#d6e2bf", "#ecd1bf", "#d2ddcf", "#ded6b7", "#d9c8e0"];

export function packTaskDetail(fields: {
  description?: string;
  category?: Category;
  deliverable?: string;
  due?: string;
  help?: boolean;
  link?: string;
}): string {
  return JSON.stringify({
    description: fields.description ?? "",
    category: fields.category ?? "ออกแบบ",
    deliverable: fields.deliverable ?? "",
    due: fields.due ?? "",
    help: fields.help ?? false,
    link: fields.link ?? "",
  });
}

export function unpackTask(row: DbTask): Task {
  let meta = {
    description: row.detail || "",
    category: "ออกแบบ" as Category,
    deliverable: "",
    due: "",
    help: false,
    link: "",
  };
  if (row.detail && row.detail.startsWith("{")) {
    try {
      const parsed = JSON.parse(row.detail);
      meta = { ...meta, ...parsed };
    } catch {}
  }
  return {
    id: row.id,
    room_id: row.room_id,
    title: row.title,
    owner: row.owner_id,
    status: STATUS_LABELS[row.status] || "ยังไม่เริ่ม",
    ...meta,
  };
}

export function unpackIdea(row: DbIdea): Idea {
  return {
    id: row.id,
    room_id: row.room_id,
    author: row.author_id,
    title: row.title,
    description: row.detail || "",
    category: row.image_data
      ? "ภาพอ้างอิง"
      : row.reference_url
        ? "ลิงก์อ้างอิง"
        : "ไอเดีย",
    kind: "note",
    approved: Boolean(row.approved),
    image: row.image_data || "",
    link: row.reference_url || "",
  };
}

export function decorateMembers(rows: DbMember[] = []): Member[] {
  return rows.map((m, i) => ({
    id: m.id,
    name: m.name,
    room_id: m.room_id,
    role: "สมาชิกของทีม",
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

export const db = {
  async request<T = unknown>(
    table: string,
    { method = "GET", query = {}, body }: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        const error: ApiError = new Error(
          data.message || `เชื่อมต่อไม่ได้ (${response.status})`,
        );
        error.code = data.code;
        error.status = response.status;
        throw error;
      }
      return data as T;
    } catch (err) {
      if (
        (err instanceof Error && err.name === "AbortError") ||
        err instanceof TypeError
      ) {
        throw new Error("เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async insert<T extends { id?: string }>(table: string, row: T): Promise<T> {
    try {
      const res = await this.request<T[]>(table, { method: "POST", body: row });
      return res[0];
    } catch (err) {
      const error = err as ApiError;
      if (error.code === "23505" && row.id) {
        const existing = await this.request<T[]>(table, {
          query: { id: `eq.${row.id}`, select: "*" },
        });
        if (existing[0]) return existing[0];
      }
      throw error;
    }
  },

  async findRoom(field: "id" | "code", value: string): Promise<DbRoom | null> {
    const rows = await this.request<DbRoom[]>("rooms", {
      query: { [field]: `eq.${value}`, select: "id,name,code" },
    });
    return rows[0] || null;
  },

  async loadRoom(roomId: string) {
    const [room, members, tasks, ideas] = await Promise.all([
      this.findRoom("id", roomId),
      this.request<DbMember[]>("members", {
        query: {
          room_id: `eq.${roomId}`,
          select: "id,name,room_id",
          order: "name.asc,id.asc",
        },
      }),
      this.request<DbTask[]>("tasks", {
        query: {
          room_id: `eq.${roomId}`,
          select: "id,title,detail,status,owner_id,room_id",
          order: "id.asc",
        },
      }),
      this.request<DbIdea[]>("ideas", {
        query: {
          room_id: `eq.${roomId}`,
          select: "*",
          order: "created_at.desc,id.asc",
        },
      }).catch(() => [] as DbIdea[]),
    ]);

    if (!room) throw new Error("ไม่พบห้องนี้ ห้องอาจถูกลบไปแล้ว");
    return {
      room,
      members: decorateMembers(members),
      tasks: tasks.map(unpackTask),
      ideas: ideas.map(unpackIdea),
    };
  },

  async ensureMember(
    roomId: string,
    memberId: string | undefined,
    name: string,
  ): Promise<DbMember> {
    if (memberId) {
      const existing = await this.request<DbMember[]>("members", {
        query: {
          id: `eq.${memberId}`,
          room_id: `eq.${roomId}`,
          select: "id,name,room_id",
        },
      });
      if (existing[0]) return existing[0];
    }
    return await this.insert<DbMember>("members", {
      id: crypto.randomUUID(),
      room_id: roomId,
      name: name || "เพื่อนใหม่",
    });
  },

  async updateMemberName(memberId: string, name: string): Promise<void> {
    if (!memberId) return;
    await this.request("members", {
      method: "PATCH",
      query: { id: `eq.${memberId}` },
      body: { name },
    });
  },

  async updateTask(
    roomId: string,
    taskId: string,
    changes: Partial<DbTask>,
  ): Promise<Task> {
    const rows = await this.request<DbTask[]>("tasks", {
      method: "PATCH",
      query: { id: `eq.${taskId}`, room_id: `eq.${roomId}` },
      body: changes,
    });
    if (!rows.length) throw new Error("ไม่พบไพ่งาน หรือข้อมูลเพิ่งถูกเปลี่ยน");
    return unpackTask(rows[0]);
  },

  async updateIdea(
    roomId: string,
    ideaId: string,
    changes: Partial<DbIdea>,
  ): Promise<Idea | null> {
    const rows = await this.request<DbIdea[]>("ideas", {
      method: "PATCH",
      query: { id: `eq.${ideaId}`, room_id: `eq.${roomId}` },
      body: changes,
    });
    return rows[0] ? unpackIdea(rows[0]) : null;
  },
};
