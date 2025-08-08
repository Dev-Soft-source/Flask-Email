export interface User {
  0: number;
  1: string;
  2: string;
  3: number;
  4: number;
  5: number;
}

export interface emailUser {
  id: number; 
  name: string;
  password: string;
  is_admin: "0" | "1";
}
