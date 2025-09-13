declare namespace Express {
  export interface Request {
    id?: string;
    userId?: string;
    user?: {
      email: string;
    };
  }
}
