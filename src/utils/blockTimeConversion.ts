export const BLOCKS_PER_DAY = 43200; // Assuming 2-second block time

export const blocksToTime = (blocks: number): { days: number; hours: number } => {
  const totalHours = Math.floor((blocks * 2) / 3600); // 2 seconds per block
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
};

export const timeToBlocks = (days: number, hours: number): number => {
  const totalHours = days * 24 + hours;
  return Math.floor((totalHours * 3600) / 2); // 2 seconds per block
};

export const formatExpirationTime = (blocks: number): string => {
  const { days, hours } = blocksToTime(blocks);
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours > 1 ? 's' : ''}` : ''}`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''}`;
};