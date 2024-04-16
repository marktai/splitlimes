import { v4 as uuidv4 } from 'uuid';

export type UserSplitExpenseType = {
  id: number,
  user: number,
  expense: number,
  pay_portion_mills: number,
  owe_portion_mills: number,
  net_portion_mills: number,
  created_time: string,
  last_updated_time: string,
};

export type ExpenseExpandedType = {
  id: number,
  name: string,
  group: number,
  total_mills: number,
  pay_json: Object,
  split_json: Object,
  user_split_expense_set: Array<UserSplitExpenseType>,
  created_time: string,
  last_updated_time: string,
};

export type GroupType = {
  id: number,
  name: string,
  users: Array<number>,
  created_time: string,
  last_updated_time: string,
}

export type UserType = {
  id: number,
  name: string,
  email: string,
  created_time: string,
  last_updated_time: string,
}

export type GroupExpandedType = {
  id: number,
  name: string,
  expense_set: Array<ExpenseExpandedType>,
  users: Array<UserType>,
  user_totals: {
    [key: number]: number,
  },
  created_time: string,
  last_updated_time: string,
}

export async function httpJson<T>(
  request: RequestInfo
): Promise<T> {
  const response = await fetch(
    request
  );
  return await response.json();
}

export function getJson<T>(
  path: string,
  args: RequestInit = { method: "GET" }
): Promise<T> {
  return httpJson<T>(new Request(path, args));
};

export function postJson<T>(
  path: string,
  body: any,
  args: RequestInit = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    },
  }
): Promise<T>  {
  return httpJson<T>(new Request(path, args));
};

export function patchJson<T>(
  path: string,
  body: any,
  args: RequestInit = {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    },
  }
): Promise<T>  {
  return httpJson<T>(new Request(path, args));
};

export default class splitService {
  public static host = '/api';

  public static getGroup(id: number|string): Promise<GroupExpandedType> {
    return getJson<GroupExpandedType>(`${this.host}/groups/${id}`);
  }

  // public static async makeGuess(id: number|string, guess: Array<AnswerType>): Promise<GuessResponseType> {
  //   const body = {
  //     guess: guess,
  //     client_id: this.getClientId(),
  //   }

  //   const response = await postJson<GuessResponse>(`${this.host}/games/${id}/guess`, body);
  //   return response.results;
  // }

  public static authorKey = 'author';
  public static clientIdKey = 'client_id';

  public static getClientId(): string {
    let author = localStorage.getItem(this.authorKey);
    let clientId = localStorage.getItem(this.clientIdKey);
    if (clientId === null) {
      clientId = uuidv4();
      localStorage.setItem(this.clientIdKey, clientId as string);
    }
    return `${author ?? 'anon'}-${clientId}`;
  }
}


// interface HttpResponse<T> extends Response {
//   parsedBody?: T;
// }
