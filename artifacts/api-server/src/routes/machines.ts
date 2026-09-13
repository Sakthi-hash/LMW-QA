import { Router, type IRouter } from "express";
import {
  BulkCompleteMachinesBody,
  BulkUpdateProcessBody,
  CreateMachineBody,
  UpdateMachineBody,
  UpdateMachineParams,
  UpdateMachineProcessBody,
  UpdateMachineProcessParams,
} from "@workspace/api-zod";
import { db, activityTable, machinesTable, PROCESS_KEYS, type MachineRow, type ProcessKey, type ProcessMap } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();
const seedPromise = seedMachines();

function emptyProcesses(): ProcessMap {
  return Object.fromEntries(
    PROCESS_KEYS.map((key) => [
      key,
      { done: false, completedBy: null, completedAt: null },
    ]),
  ) as ProcessMap;
}

function deriveStatus(processes: ProcessMap) {
  const doneCount = PROCESS_KEYS.filter((key) => processes[key]?.done).length;
  if (doneCount === PROCESS_KEYS.length) return "completed" as const;
  if (doneCount > 0) return "in_progress" as const;
  return "not_started" as const;
}

function formatMachine(machine: MachineRow) {
  return {
    id: machine.id,
    bedNumber: machine.bedNumber,
    name: machine.name,
    status: machine.status as "not_started" | "in_progress" | "completed",
    processes: machine.processes,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString(),
  };
}

async function seedMachines() {
  const existing = await db
    .select({ id: machinesTable.id })
    .from(machinesTable)
    .limit(1);
  if (existing.length > 0) return;

  const completed = emptyProcesses();
  for (const key of PROCESS_KEYS) {
    completed[key] = {
      done: true,
      completedBy: "QA Supervisor",
      completedAt: new Date().toISOString(),
    };
  }

  await db.insert(machinesTable).values([
    {
      bedNumber: "BED-2041",
      name: "Atlas CNC",
      status: "in_progress",
      processes: {
        ...emptyProcesses(),
        reliability: {
          done: true,
          completedBy: "Sakthi",
          completedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        },
        laser: {
          done: true,
          completedBy: "Priya",
          completedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        },
      },
    },
    {
      bedNumber: "BED-2042",
      name: "Orion CNC",
      status: "completed",
      processes: completed,
    },
    {
      bedNumber: "BED-2043",
      name: "Nova CNC",
      status: "not_started",
      processes: emptyProcesses(),
    },
  ]);
}

async function getMachine(id: number) {
  const rows = await db
    .select()
    .from(machinesTable)
    .where(eq(machinesTable.id, id))
    .limit(1);
  return rows[0];
}

async function updateProcess(
  machineId: number,
  process: ProcessKey,
  done: boolean,
  updatedBy: string,
) {
  const machine = await getMachine(machineId);
  if (!machine) return null;

  const updatedAt = new Date();
  const processes = {
    ...machine.processes,
    [process]: {
      done,
      completedBy: done ? updatedBy : null,
      completedAt: done ? updatedAt.toISOString() : null,
    },
  } as ProcessMap;

  await db
    .update(machinesTable)
    .set({
      processes,
      status: deriveStatus(processes),
      updatedAt,
    })
    .where(eq(machinesTable.id, machineId));

  await db.insert(activityTable).values({
    machineId,
    bedNumber: machine.bedNumber,
    machineName: machine.name,
    process,
    completed: done,
    updatedBy,
    updatedAt,
  });

  return getMachine(machineId);
}

router.get("/machines", async (_req, res) => {
  await seedPromise;
  const machines = await db
    .select()
    .from(machinesTable)
    .orderBy(desc(machinesTable.updatedAt));
  res.json(machines.map(formatMachine));
});

router.post("/machines", async (req, res) => {
  const input = CreateMachineBody.parse(req.body);
  const [machine] = await db
    .insert(machinesTable)
    .values({
      bedNumber: input.bedNumber.trim(),
      name: input.name.trim(),
      status: "not_started",
      processes: emptyProcesses(),
    })
    .returning();
  res.status(201).json(formatMachine(machine));
});

router.patch("/machines/:machineId", async (req, res) => {
  const { machineId } = UpdateMachineParams.parse(req.params);
  const input = UpdateMachineBody.parse(req.body);
  const machine = await getMachine(machineId);
  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }

  const [updated] = await db
    .update(machinesTable)
    .set({
      ...(input.bedNumber ? { bedNumber: input.bedNumber.trim() } : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(machinesTable.id, machineId))
    .returning();
  res.json(formatMachine(updated));
});

router.patch("/machines/:machineId/processes/:process", async (req, res) => {
  const { machineId, process } = UpdateMachineProcessParams.parse(req.params);
  const input = UpdateMachineProcessBody.parse(req.body);
  const updated = await updateProcess(
    machineId,
    process as ProcessKey,
    input.done,
    input.updatedBy.trim(),
  );
  if (!updated) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }
  res.json(formatMachine(updated));
});

router.post("/machines/bulk-process", async (req, res) => {
  const input = BulkUpdateProcessBody.parse(req.body);
  const updated = await Promise.all(
    input.machineIds.map((machineId) =>
      updateProcess(
        machineId,
        input.process as ProcessKey,
        input.done,
        input.updatedBy.trim(),
      ),
    ),
  );
  res.json(updated.filter(Boolean).map(formatMachine));
});

router.post("/machines/bulk-complete", async (req, res) => {
  const input = BulkCompleteMachinesBody.parse(req.body);
  const updated = await Promise.all(
    input.machineIds.flatMap((machineId) =>
      PROCESS_KEYS.map((process) =>
        updateProcess(machineId, process, true, input.updatedBy.trim()),
      ),
    ),
  );
  const uniqueMachines = new Map(
    updated
      .filter(Boolean)
      .map((machine) => [machine!.id, machine!]),
  );
  res.json([...uniqueMachines.values()].map(formatMachine));
});

router.get("/summary", async (_req, res) => {
  await seedPromise;
  const machines = await db.select().from(machinesTable);
  const processTotals = Object.fromEntries(
    PROCESS_KEYS.map((key) => [
      key,
      machines.filter((machine) => machine.processes[key]?.done).length,
    ]),
  );
  res.json({
    total: machines.length,
    notStarted: machines.filter((machine) => machine.status === "not_started").length,
    inProgress: machines.filter((machine) => machine.status === "in_progress").length,
    completed: machines.filter((machine) => machine.status === "completed").length,
    processTotals,
  });
});

router.get("/activity", async (_req, res) => {
  await seedPromise;
  const activities = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.updatedAt))
    .limit(30);
  res.json(
    activities.map((activity) => ({
      id: activity.id,
      machineId: activity.machineId,
      bedNumber: activity.bedNumber,
      machineName: activity.machineName,
      process: activity.process as ProcessKey,
      completed: activity.completed,
      updatedBy: activity.updatedBy,
      updatedAt: activity.updatedAt.toISOString(),
    })),
  );
});

export default router;