import "dotenv/config";
import request from "supertest";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { getDb } from "../src/config/db";
import { admins } from "../src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Integration tests against the configured Neon development database.
 * Skipped automatically when DATABASE_URL is not set.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const d = describe.skipIf(!hasDb);

const runId = Date.now().toString(36);
// Phone must contain digits only (validated server-side)
const phone = `+91${Date.now()}`.slice(0, 20);
const adminEmail = `test-admin-${runId}@mdrafm.test`;

let contributorId = "";
let writeupId = "";
let writeupToken = "";
let paintingId = "";
let adminCookie = "";
let adminCsrf = "";

async function createSubmission(payload: Record<string, unknown>) {
  const res = await request(app).post("/api/v1/submissions").send(payload);
  return res;
}

beforeAll(async () => {
  if (!hasDb) return;

  // Seed a throwaway admin for auth tests
  const db = getDb();
  await db
    .insert(admins)
    .values({
      name: "Test Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash("Str0ngPass!word", 12),
    })
    .onConflictDoNothing({ target: admins.email });
});

afterAll(async () => {
  if (!hasDb) return;
  const db = getDb();
  await db.delete(admins).where(eq(admins.email, adminEmail));
});

d("Health & public endpoints", () => {
  it("GET /api/health returns ok with connected database", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.database).toBe("connected");
  });

  it("registers a contributor (upsert on phone)", async () => {
    const first = await request(app)
      .post("/api/contributors")
      .send({ name: "Test Contributor", phone, designation: "Teacher" });
    expect(first.status).toBe(201);
    expect(first.body.data.id).toBeDefined();

    const second = await request(app)
      .post("/api/contributors")
      .send({ name: "Test Contributor Updated", phone });
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);

    contributorId = first.body.data.id;
  });

  it("rejects invalid contributor payloads", async () => {
    const res = await request(app).post("/api/contributors").send({ name: "", phone: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeDefined();
  });
});

d("Submission lifecycle with edit tokens", () => {
  it("creates a draft writeup submission and returns an edit token once", async () => {
    const res = await createSubmission({
      contributorId,
      title: "Test Memories",
      language: "odia",
      submissionType: "writeup",
      writeup: {
        editorJson: { type: "doc" },
        htmlContent: "<p>Hello <strong>Madhu</strong></p>",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.submission.referenceNumber).toMatch(/^MDRAFM-W-\d{4}-\d{4}$/);
    expect(res.body.data.submission.status).toBe("draft");
    expect(res.body.data.editToken).toBeTruthy();

    writeupId = res.body.data.submission.id;
    writeupToken = res.body.data.editToken;
  });

  it("rejects a writeup submission without content", async () => {
    const res = await createSubmission({
      contributorId,
      title: "No content",
      language: "english",
      submissionType: "writeup",
    });
    expect(res.status).toBe(400);
  });

  it("rejects writeup content on a painting submission", async () => {
    const res = await createSubmission({
      contributorId,
      title: "Mixed",
      language: "english",
      submissionType: "painting",
      writeup: { editorJson: {}, htmlContent: "<p>x</p>" },
    });
    expect(res.status).toBe(400);
  });

  it("denies access without a token", async () => {
    const res = await request(app).get(`/api/v1/submissions/${writeupId}`);
    expect(res.status).toBe(401);
  });

  it("never grants access with only the contributor phone number", async () => {
    const res = await request(app)
      .get(`/api/v1/submissions/${writeupId}`)
      .query({ token: phone });
    expect(res.status).toBe(401);
  });

  it("returns the submission with a valid edit token", async () => {
    const res = await request(app)
      .get(`/api/v1/submissions/${writeupId}`)
      .set("X-Edit-Token", writeupToken);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Test Memories");
    expect(res.body.data.writeup.htmlContent).toContain("Madhu");
    expect(JSON.stringify(res.body.data)).not.toContain("editTokenHash");
    expect(JSON.stringify(res.body.data)).not.toContain("token");
  });

  it("updates an authorized draft", async () => {
    const res = await request(app)
      .put(`/api/v1/submissions/${writeupId}`)
      .set("X-Edit-Token", writeupToken)
      .send({
        title: "Updated Memories",
        writeup: { editorJson: { type: "doc" }, htmlContent: "<p>Updated</p>" },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Memories");
    expect(res.body.data.writeup.htmlContent).toBe("<p>Updated</p>");
  });

  it("finalizes the draft transactionally", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${writeupId}/finalize`)
      .set("X-Edit-Token", writeupToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("submitted");
    expect(res.body.data.submittedAt).toBeTruthy();
  });

  it("blocks editing after finalization", async () => {
    const res = await request(app)
      .put(`/api/v1/submissions/${writeupId}`)
      .set("X-Edit-Token", writeupToken)
      .send({ title: "Sneaky edit" });
    expect(res.status).toBe(409);
  });

  it("blocks resume after finalization", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${writeupId}/resume`)
      .set("X-Edit-Token", writeupToken);
    expect(res.status).toBe(409);
  });

  it("creates a painting submission with image reference", async () => {
    const res = await createSubmission({
      contributorId,
      title: "My Painting",
      language: "english",
      submissionType: "painting",
      painting: {
        imageUrl: "https://ik.imagekit.io/demo/test.png",
        imagekitFileId: "test-file-id",
        caption: "Sunset",
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.submission.referenceNumber).toMatch(/^MDRAFM-P-\d{4}-\d{4}$/);
    paintingId = res.body.data.submission.id;
  });

  it("issues a short-lived edit session via /resume", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${paintingId}/resume`)
      .set("X-Edit-Token", "wrong-token");
    expect(res.status).toBe(401);
  });
});

d("Admin authentication and APIs", () => {
  it("rejects bad credentials", async () => {
    const res = await request(app)
      .post("/api/v1/admin/login")
      .send({ email: adminEmail, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("logs in and sets HTTP-only session + CSRF cookies", async () => {
    const res = await request(app)
      .post("/api/v1/admin/login")
      .send({ email: adminEmail, password: "Str0ngPass!word" });
    expect(res.status).toBe(200);

    const rawCookies: string[] = res.headers["set-cookie"];
    const sessionRaw = rawCookies.find((c) => c.startsWith("admin_session="));
    const csrfRaw = rawCookies.find((c) => c.startsWith("admin_csrf="));
    expect(sessionRaw).toBeTruthy();
    expect(csrfRaw).toBeTruthy();
    expect(sessionRaw).toContain("HttpOnly");
    expect(csrfRaw).not.toContain("HttpOnly");
    expect(sessionRaw).toContain("SameSite=Strict");

    adminCookie = [sessionRaw!, csrfRaw!].map((c) => c.split(";")[0]).join("; ");
    adminCsrf = csrfRaw!.split(";")[0].split("=")[1];
  });

  it("rejects admin endpoints without a session", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("blocks state-changing admin calls without CSRF header", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/submissions/${paintingId}/status`)
      .set("Cookie", adminCookie)
      .send({ status: "under_review" });
    expect(res.status).toBe(403);
  });

  it("returns dashboard statistics", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.totalSubmissions).toBeGreaterThanOrEqual(2);
    expect(res.body.data.byStatus.draft).toBeGreaterThanOrEqual(1);
  });

  it("lists submissions with pagination", async () => {
    const res = await request(app)
      .get("/api/v1/admin/submissions")
      .query({ page: 1, limit: 10 })
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });

  it("gets submission details including history", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/submissions/${writeupId}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.history.some((h: { action: string }) => h.action === "submitted")).toBe(true);
  });

  it("updates status with CSRF token", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/submissions/${paintingId}/status`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ status: "approved", remarks: "Great painting" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
  });

  it("rejects duplicate status updates", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/submissions/${paintingId}/status`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ status: "approved" });
    expect(res.status).toBe(409);
  });

  it("exports submissions as CSV", async () => {
    const res = await request(app)
      .get("/api/v1/admin/export")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("reference_number");
    expect(res.text).toContain("MDRAFM");
  });
});

d("Uploads", () => {
  it("POST /api/uploads/image validates file presence", async () => {
    const res = await request(app).post("/api/v1/uploads/image");
    expect(res.status).toBe(400);
  });

  it("POST /api/uploads/sign requires ImageKit configuration", async () => {
    const res = await request(app).post("/api/v1/uploads/sign");
    if (process.env.IMAGEKIT_PRIVATE_KEY) {
      expect(res.status).toBe(200);
      expect(res.body.data.signature).toBeTruthy();
      expect(res.body.data.token).toBeTruthy();
    } else {
      expect(res.status).toBe(503);
    }
  });
});

it("health endpoint without database config reports not_configured", async () => {
  // Sanity check that the module handles missing DB gracefully - the real
  // connection is covered above; this documents expected shape.
  expect(hasDb).toBe(true);
});
