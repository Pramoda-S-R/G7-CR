export interface ChatHistoryItem {
  inputs: {
    question: string;
  };
  outputs: {
    answer: string;
  };
}
