// /src/services/userService.ts
// converts phone numbers to wallet addresses, cool maybe keep for a bit

export const getUserWalletAddressByEmail = async (email: string): Promise<string> => {
  try {
    const response = await fetch('/api/getUserWalletAddressByEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet address by email');
    }

    const data = await response.json();
    return data.walletAddress || "";
  } catch (error) {
    console.error("Error fetching wallet address by email:", error);
    throw new Error("Failed to fetch wallet address by email");
  }
};

export const getUserWalletAddressByPhone = async (phone: string): Promise<string> => {
  try {
    const response = await fetch('/api/getUserWalletAddressByPhone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet address by phone');
    }

    const data = await response.json();
    return data.walletAddress || "";
  } catch (error) {
    console.error("Error fetching wallet address by phone:", error);
    throw new Error("Failed to fetch wallet address by phone");
  }
};
