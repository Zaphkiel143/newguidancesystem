import AiChatScreen from "../../../components/AiChatScreen";

// The Anthropic call can take longer than the platform's default function
// timeout, especially with thinking enabled - give the Server Action room.
export const maxDuration = 60;

export default function AiChatPage() {
  return <AiChatScreen messagesPath="/my_messages" />;
}
