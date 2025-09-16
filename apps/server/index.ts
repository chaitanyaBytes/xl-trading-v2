import experss from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import { DEVELOPMENT_URL, NODE_ENV, PORT, PRODUCTION_URL } from "./config";
import router from "./routes";

const app = experss();

app.use(experss.json());
app.use(cookieParser());

const corsOptions: CorsOptions = {
  origin: NODE_ENV === "production" ? PRODUCTION_URL : DEVELOPMENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-VERIFY",
    "X-MERCHANT-ID",
  ],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(experss.urlencoded({ extended: true }));

app.get("/", async (req: Request, res: Response) => {
  res.status(200).send("server is healthy");
});

app.use("/api/v1", router);

app.listen(PORT, () => {
  console.log(`Sever is running on port ${PORT}`);
});
