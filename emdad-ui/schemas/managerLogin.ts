//schemas/managerLogin.ts
import { z } from "zod";
export const ManagerLoginSchema = z.object({
  email: z.string().email("أدخل بريد إلكتروني صالح"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  remember: z.boolean().optional(),
});
export type ManagerLoginForm = z.infer<typeof ManagerLoginSchema>;
