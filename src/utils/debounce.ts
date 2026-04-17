export const debounce = (fn: (...args: any[]) => void, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: any[]) => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

// Ultra-fast debounce for instant UI response
export const instantDebounce = (
  fn: (...args: any[]) => void,
  delay: number = 16,
) => {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: any[]) => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
