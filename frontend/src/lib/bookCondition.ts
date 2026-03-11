export const conditionOptions = [
  { value: "1", label: "ใหม่เอี่ยม ✨" },
  { value: "2", label: "สภาพดี" },
  { value: "3", label: "มีตำหนิเล็กน้อย" },
  { value: "4", label: "ชำรุดหนัก" },
  { value: "5", label: "อ่านได้ก็บุญแล้ว" },
] as const;

const conditionMap = new Map(conditionOptions.map((option) => [option.value, option.label]));

export const normalizeConditionLabel = (condition: string | null | undefined): string => {
  if (!condition) return "ไม่ระบุ";
  return conditionMap.get(condition) ?? condition;
};
