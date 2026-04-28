import { describe, it, expect } from "vitest";
import {
  EngineerSchema,
  EngineerSummarySchema,
  EngineerShareSchema,
  EngineerCreateSchema,
  EngineerUpdateSchema,
  ObjectEngineerRowSchema,
} from "../types/engineer";

describe("M-03 Zod schemas", () => {
  it("EngineerSchema parses a valid engineer", () => {
    const raw = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ivanov Petr Sergeevich",
      email: "ivanov@workload.local",
      role: "engineer",
      homeDivisionId: "660e8400-e29b-41d4-a716-446655440000",
      homeDivisionName: "Brest No. 100",
      capacityFte: 1.0,
      isActive: true,
      objectCount: 47,
      totalLoad: 0.92,
      loadRatio: 0.92,
      status: "WARNING",
    };
    const result = EngineerSchema.parse(raw);
    expect(result.name).toBe("Ivanov Petr Sergeevich");
    expect(result.status).toBe("WARNING");
  });

  it("EngineerSchema rejects invalid status", () => {
    const raw = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      email: "test@test.com",
      role: "engineer",
      homeDivisionId: "660e8400-e29b-41d4-a716-446655440000",
      homeDivisionName: "Test",
      capacityFte: 1.0,
      isActive: true,
      objectCount: 0,
      totalLoad: 0,
      loadRatio: 0,
      status: "INVALID",
    };
    const result = EngineerSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("EngineerSummarySchema parses full breakdown", () => {
    const raw = {
      engineerId: "550e8400-e29b-41d4-a716-446655440000",
      totalLoad: 0.921,
      objectCount: 47,
      osLoad: 0.41,
      psLoad: 0.27,
      videoLoad: 0.09,
      recordsLoad: 0.05,
      repairLoad: 0.1,
      capacityFte: 1.0,
      loadRatio: 0.921,
      status: "WARNING",
    };
    const result = EngineerSummarySchema.parse(raw);
    expect(result.totalLoad).toBeCloseTo(0.921);
    expect(result.osLoad).toBeCloseTo(0.41);
  });

  it("EngineerShareSchema parses per-object share", () => {
    const raw = {
      objectId: "550e8400-e29b-41d4-a716-446655440000",
      objectName: "CBU Brest, Lenina St., 10",
      divisionName: "Brest",
      branchName: "Branch 1",
      engineerShare: 0.032,
      itogoChisloWithTravel: 0.064,
      engineerCount: 2,
    };
    const result = EngineerShareSchema.parse(raw);
    expect(result.engineerShare).toBeCloseTo(0.032);
    expect(result.engineerCount).toBe(2);
  });

  it("ObjectEngineerRowSchema parses an engineer assigned to an object", () => {
    const raw = {
      engineerId: "550e8400-e29b-41d4-a716-446655440000",
      engineerName: "Ivanov Petr Sergeevich",
      objectShare: 0.0161,
      loadRatio: 0.82,
      status: "NORMAL",
    };
    const result = ObjectEngineerRowSchema.parse(raw);
    expect(result.objectShare).toBeCloseTo(0.0161);
  });

  it("EngineerCreateSchema validates required fields", () => {
    const valid = EngineerCreateSchema.safeParse({
      name: "New Engineer",
      email: "new@workload.local",
      capacityFte: 1.0,
      homeDivisionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(valid.success).toBe(true);

    const noEmail = EngineerCreateSchema.safeParse({
      name: "New Engineer",
      email: "",
      capacityFte: 1.0,
      homeDivisionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(noEmail.success).toBe(false);
  });

  it("EngineerCreateSchema rejects capacityFte <= 0", () => {
    const result = EngineerCreateSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      capacityFte: 0,
      homeDivisionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("EngineerUpdateSchema accepts partial update", () => {
    const result = EngineerUpdateSchema.safeParse({
      capacityFte: 0.5,
    });
    expect(result.success).toBe(true);
  });
});
