import { createContext } from "react";
import { type StateType } from "./Stream";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type UIMessage, type RemoveUIMessage } from "@langchain/langgraph-sdk/react-ui";
import { type Message } from "@langchain/langgraph-sdk";

type useTypedStream = typeof useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<useTypedStream>;
export const StreamContext = createContext<StreamContextType | undefined>(undefined);