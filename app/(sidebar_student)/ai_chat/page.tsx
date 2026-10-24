import AiChatClient from "./AiChatClient";

// Gives the chatbot reply more time than the default server limit
export const maxDuration = 60;

export default function AiChatPage() {
  return <AiChatClient />;
}
