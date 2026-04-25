export interface ChessArchiveResponse {
  archives: string[];
}

export interface EcoData {
  parent: string;
  variation: string;
  name: string;
  pgn: string;
}

export interface EcoIndex {
  [ecoCode: string]: EcoData;
}

export interface ChessGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  tcn: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: ChessPlayer;
  black: ChessPlayer;
  accuracies?: {
    white: number;
    black: number;
  };
}

export interface ChessPlayer {
  rating: number;
  result: string;
  "@id": string;
  username: string;
  uuid: string;
}

export interface ChessArchiveGamesResponse {
  games: ChessGame[];
}

export interface FormattedGame {
  date: string;
  white: string;
  black: string;
  result: string;
  pgn: string;
  url: string;
}
