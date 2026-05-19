let dayKey = "";
let total = 0;

const utcDayKey = (): string => new Date().toISOString().slice(0, 10);

export const recordInputTokens = (tokens: number): void => {
    const today = utcDayKey();

    if (dayKey !== today) {
        dayKey = today;
        total = 0;
    }

    total += tokens;
};

export const getDailyTokenTotal = (): number => {
    const today = utcDayKey();

    if (dayKey !== today) {
        return 0;
    }

    return total;
};
