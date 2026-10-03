import { pgTable, text, doublePrecision, uniqueIndex, index } from "drizzle-orm/pg-core";

export const cows = pgTable("cows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tag: text("tag").notNull(),
  breed: text("breed").notNull(),
  birth: text("birth").notNull().default(""),
  status: text("status").notNull(),
  father: text("father").notNull().default(""),
  mother: text("mother").notNull().default(""),
  notes: text("notes").notNull().default(""),
  photo: text("photo").notNull().default(""),
  bodyPhoto: text("body_photo").notNull().default(""),
  milkProduction: text("milk_production").notNull().default(""),
  calvings: text("calvings").notNull().default(""),
  lastCalving: text("last_calving").notNull().default(""),
  insemination: text("insemination").notNull().default(""),
  expectedCalving: text("expected_calving").notNull().default(""),
  lastExam: text("last_exam").notNull().default(""),
  examResult: text("exam_result").notNull().default(""),
  medicine: text("medicine").notNull().default(""),
  medicineDate: text("medicine_date").notNull().default(""),
  age: text("age").notNull().default(""),
  photoFrame: text("photo_frame").notNull().default(""),
  bodyFrame: text("body_frame").notNull().default(""),
}, (t) => [uniqueIndex("cows_tag_unique").on(t.tag)]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  cowId: text("cow_id").notNull().references(() => cows.id),
  kind: text("kind").notNull(),
  date: text("date").notNull(),
  value: doublePrecision("value"),
  result: text("result").notNull().default(""),
  notes: text("notes").notNull().default(""),
  due: text("due").notNull().default(""),
  withdrawal: text("withdrawal").notNull().default(""),
}, (t) => [index("events_cow_date").on(t.cowId, t.date)]);
