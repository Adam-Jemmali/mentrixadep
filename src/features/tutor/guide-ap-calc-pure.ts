import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export type GuideApCalcCourse = {
  id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
};

export function findGuideApCalcCourse(courses: GuideApCalcCourse[]): GuideApCalcCourse | undefined {
  return courses.find((course) => isApCalculusAbSubject(course.course_name));
}

export function guideApCalcVerified(courses: GuideApCalcCourse[]): boolean {
  return findGuideApCalcCourse(courses)?.verified === true;
}

export { AP_CALC_AB_SUBJECT };
