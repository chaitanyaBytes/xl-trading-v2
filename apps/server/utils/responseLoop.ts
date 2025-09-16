import { blockingClient, QUEUE_NAMES } from "@repo/common";

export class ResponseLoop {
  private idResponseMap: Record<
    string,
    { resolve: (msg: string) => void; reject: (msg: string) => void }
  > = {};

  constructor() {
    this.runLoop();
  }

  async runLoop() {
    while (1) {
      const res = await blockingClient.xread(
        "COUNT",
        1,
        "BLOCK",
        0,
        "STREAMS",
        QUEUE_NAMES.RESPONSE_QUEUE,
        "$"
      );

      if (!res) continue;

      console.log("response: ", res);

      const resObj = this.fieldsToObject(res);
      const reqType = resObj["type"];
      const reqId = resObj["reqId"];

      console.log("reqId: ", reqId, "ReqType: ", reqType);
      this.idResponseMap[reqId!]?.resolve(
        JSON.stringify({ orderId: resObj["orderId"], order: resObj["order"] })
      );
      delete this.idResponseMap[reqId!];
    }
  }

  async waitForResposne(id: string) {
    return new Promise<void | string>((resolve, reject) => {
      setTimeout(() => {
        if (this.idResponseMap[id]) {
          delete this.idResponseMap[id];
          reject("Response not resolved in time");
        }
      }, 3500);
      this.idResponseMap[id] = { resolve, reject };
    });
  }

  private fieldsToObject(
    streamRes: [key: string, items: [id: string, fields: string[]][]][]
  ): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [, items] of streamRes) {
      for (const [id, fields] of items) {
        for (let i = 0; i + 1 < fields.length; i += 2) {
          obj[fields[i]!] = fields[i + 1] ?? "";
        }
      }
    }

    return obj;
  }
}

export const responseLoopObj = new ResponseLoop();
