import type { Talk, Teacher } from "@/lib/domain/talk";

export function getTeacherNames(talk: Talk, teachers: ReadonlyMap<number, Teacher>): string {
  const names = talk.teacherIds
    .map((teacherId) => teachers.get(teacherId)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(" & ") : "Teacher attribution loading";
}
