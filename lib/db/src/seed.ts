import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db,
  municipalitiesTable,
  bairrosTable,
  usersTable,
  type UserRole,
} from "./index";

async function ensureMunicipality() {
  const existing = await db.query.municipalitiesTable.findFirst({
    where: eq(municipalitiesTable.slug, "mulenvos"),
  });
  if (existing) {
    console.log(`[seed] municipality exists: ${existing.name}`);
    return existing;
  }
  const [created] = await db
    .insert(municipalitiesTable)
    .values({
      slug: "mulenvos",
      name: "Mulenvos",
      province: "Luanda",
    })
    .returning();
  console.log(`[seed] municipality created: ${created.name}`);
  return created;
}

async function ensureBairros(municipalityId: string) {
  const bairros: { name: string; estrato: "A" | "B" | "C" }[] = [
    { name: "KM 9-B", estrato: "A" },
    { name: "KM 12-B", estrato: "A" },
    { name: "Mulenvos de Cima", estrato: "B" },
    { name: "Baixa de Cassanje", estrato: "B" },
    { name: "KM 14-B", estrato: "B" },
    { name: "Boa-Fé", estrato: "B" },
    { name: "CAOP A", estrato: "C" },
    { name: "CAOP B", estrato: "C" },
    { name: "CAOP C", estrato: "C" },
    { name: "Capalanga", estrato: "C" },
  ];
  for (const b of bairros) {
    const existing = await db.query.bairrosTable.findFirst({
      where: eq(bairrosTable.name, b.name),
    });
    if (!existing) {
      await db
        .insert(bairrosTable)
        .values({ municipalityId, name: b.name, estrato: b.estrato });
      console.log(`[seed] bairro created: ${b.name}`);
    }
  }
}

async function ensureUser(
  email: string,
  name: string,
  role: UserRole,
  password: string,
  municipalityId: string,
) {
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (existing) {
    console.log(`[seed] user exists: ${email}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(usersTable)
    .values({ email, name, role, passwordHash, municipalityId })
    .returning();
  console.log(`[seed] user created: ${email} (${role})`);
  return created;
}

async function seed() {
  console.log("[seed] starting");
  const muni = await ensureMunicipality();
  await ensureBairros(muni.id);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@op1na1.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2025";
  await ensureUser(
    adminEmail,
    "Administrador",
    "admin",
    adminPassword,
    muni.id,
  );

  const techEmail =
    process.env.SEED_TECHNICIAN_EMAIL ?? "tecnico@op1na1.local";
  const techPassword =
    process.env.SEED_TECHNICIAN_PASSWORD ?? "ChangeMe!2025";
  await ensureUser(
    techEmail,
    "Técnico Demo",
    "technician",
    techPassword,
    muni.id,
  );

  console.log("[seed] done");
  console.log(`[seed]   admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`[seed]   technician login: ${techEmail} / ${techPassword}`);
  console.log(
    "[seed]   ⚠ change SEED_*_PASSWORD env vars before production seed.",
  );
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[seed] failed", e);
    process.exit(1);
  });
