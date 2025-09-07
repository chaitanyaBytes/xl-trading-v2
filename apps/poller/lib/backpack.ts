import { config } from "@repo/common";

export const DECIMALS = 6;

export const toScaledInt = (s: string, d: number = DECIMALS): bigint => {
  const price: number = Number(s);
  return BigInt(Math.abs(price * Math.pow(10, d)));
};

export const pricePoller = (pairs: string[]) => {
  const backpackUrl = config.backpack.BACKPACK_URL!;

  let ws: WebSocket | null = null;
  let keep: NodeJS.Timeout | null = null;

  const connect = () => {
    ws = new WebSocket(backpackUrl);

    ws.onopen = () => {
      console.log("Connected to backpack stream");
      ws?.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: pairs.map((p) => `bookTicker.${p}`),
        })
      );

      keep = setInterval(() => {
        if (ws?.readyState === ws?.OPEN) ws?.ping();
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);

        const tickerData = parsedData ?? parsedData.data;

        console.log(JSON.stringify(tickerData));
      } catch {}
    };

    ws.onclose = () => {
      console.log("Backpack disconnected. Retrying.. ");
      if (keep) clearInterval(keep);
      setTimeout(connect, 2000);
    };

    ws.onerror = (event) => {
      console.log("ws error: ", event);
      ws?.close();
    };
  };

  connect();
};
