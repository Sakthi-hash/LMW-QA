import { boolean, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const PROCESS_KEYS = [
  "reliability",
  "laser",
  "lkc",
  "fuc",
  "ct",
  "tag",
] as const;

export type ProcessKey = (typeof PROCESS_KEYS)[number];

export type ProcessState = {
  done: boolean;
  completedBy: string | null;
  completedAt: string | null;
};

export type ProcessMap = Record<ProcessKey, ProcessState>;

export const machinesTable = pgTable("machines", {
  id: serial("id").primaryKey(),
  bedNumber: varchar("bed_number", { length: 80 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  workNo: varchar("work_no", { length: 80 }).notNull().default(""),
  remarks: varchar("remarks", { length: 500 }).notNull().default(""),
  status: varchar("status", { length: 24 }).notNull().default("not_started"),
  processes: jsonb("processes").$type<ProcessMap>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityTable = pgTable("machine_activity", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  bedNumber: varchar("bed_number", { length: 80 }).notNull(),
  machineName: varchar("machine_name", { length: 160 }).notNull(),
  process: varchar("process", { length: 24 }).notNull(),
  completed: boolean("completed").notNull().default(true),
  updatedBy: varchar("updated_by", { length: 120 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MachineRow = typeof machinesTable.$inferSelect;
export type ActivityRow = typeof activityTable.$inferSelect;