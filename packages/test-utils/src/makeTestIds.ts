export type TestIdFactory = {
  nextId: (prefix: string) => string;
  currentCount: () => number;
};

export function makeTestIds(): TestIdFactory {
  let counter = 0;

  return {
    nextId: (prefix: string) => {
      counter += 1;
      return `${prefix}_${counter}`;
    },
    currentCount: () => counter
  };
}
