const JPYC_CONTRACT = "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BF";
const JPYC_DECIMALS = 18;

export async function usdToJpyc(usdAmount: number): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=jpyc&vs_currencies=usd"
    );
    const data = await res.json();
    const jpycPerUsd = 1 / data.jpyc.usd;
    return Math.ceil(usdAmount * jpycPerUsd);
  } catch {
    // fallback: 1 USD ≈ 150 JPYC
    return Math.ceil(usdAmount * 150);
  }
}

export function formatJpyc(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")} JPYC`;
}

export { JPYC_CONTRACT, JPYC_DECIMALS };
