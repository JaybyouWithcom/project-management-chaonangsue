export const conditionOptions = [
  { value: "1", label: "ใหม่มาก" },
  { value: "2", label: "ดีมาก" },
  { value: "3", label: "ดี" },
  { value: "4", label: "พอใช้" },
  { value: "5", label: "แย่" },
] as const;

const conditionMap = new Map(conditionOptions.map((option) => [option.value, option.label]));

export const normalizeConditionLabel = (condition: string | null | undefined): string => {
  if (!condition) return "ไม่ระบุ";
  return conditionMap.get(condition) ?? condition;
};
