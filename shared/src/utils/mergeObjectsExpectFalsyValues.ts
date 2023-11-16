import { keys } from "ramda";

export const mergeObjectsExceptFalsyValues = <T>(
  partialObj: Partial<T>,
  priorityObj: Partial<T>,
): Partial<T> => {
  const allKeys = [
    ...new Set([...keys(priorityObj), ...keys(partialObj)]),
  ] satisfies (keyof T)[];

  return allKeys.reduce<Partial<T>>((acc, key) => {
    const priorityValue = priorityObj[key];
    return {
      ...acc,
      [key]:
        priorityValue || priorityValue === false
          ? priorityValue
          : partialObj[key],
    };
  }, {});
};
