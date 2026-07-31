import { z } from "zod";

// Tipo de SUBJECT autenticável. Discrimina identidade organizacional (user) da identidade
// global da plataforma (creator) sem unificá-las numa entidade "Principal".
export const subjectTypeSchema = z.enum(["user", "creator"]);
export type SubjectType = z.infer<typeof subjectTypeSchema>;
