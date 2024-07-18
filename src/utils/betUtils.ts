// utils/betUtils.ts

/**
 * Converts bet status code to human-readable text.
 * @param status - The status code of the bet.
 * @returns The human-readable status text.
 */
export const getBetStatusText = (status: number): string => {
    switch (status) {
      case 0:
        return "Unfunded";
      case 1:
        return "Partially Funded (Better 1 has funded)";
      case 2:
        return "Partially Funded (Better 2 has funded)";
      case 3:
        return "Open";
      case 4:
        return "Resolved";
      case 5:
        return "Canceled";
      default:
        return "Unknown Status";
    }
  };
  