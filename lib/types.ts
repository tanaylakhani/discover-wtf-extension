import {
  ChatRequestOptions,
  FileUIPart,
  InferUITool,
  Tool,
  UIMessage,
} from "ai";
import { PublicRandomLink } from "./utils";

export type ChatTools = {
  getSimilarLinks: InferUITool<
    Tool<{
      name: string;
    }>
  >;
  bookmarkLink: InferUITool<
    Tool<{
      name: string;
    }>
  >;
};

export type CustomUIDataTypes = {
  getSimilarLinks: {
    text?: string;
    links?: PublicRandomLink[];
    status: "fetching" | "found-n-items" | "links-loading" | "complete";
  };
  bookmarkLink: {
    text?: string;
    bookmarked?: boolean;
    status: "fetching" | "complete";
  };
  getRelatedQuestions: {
    status: "generating" | "complete" | "error";
    prompts?: string[];
    error?: string;
  };
};

export type ChatMessage = UIMessage<never, CustomUIDataTypes, ChatTools>;

export type TSendMessage = (
  message?:
    | (Omit<ChatMessage, "id" | "role"> & {
        id?: string | undefined;
        role?: "system" | "user" | "assistant" | undefined;
      } & {
        text?: never;
        files?: never;
        messageId?: string;
      })
    | {
        text: string;
        files?: FileList | FileUIPart[];
        metadata?: undefined;
        parts?: never;
        messageId?: string;
      }
    | {
        files: FileList | FileUIPart[];
        metadata?: undefined;
        parts?: never;
        messageId?: string;
      }
    | undefined,
  options?: ChatRequestOptions
) => Promise<void>;
