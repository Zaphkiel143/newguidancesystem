import AiChatScreen from "../../../components/AiChatScreen";

// Faculty get the same E-Gabay Chatbot as students.
export const maxDuration = 60;

export default function FacultyChatPage() {
  return <AiChatScreen messagesPath="/faculty_message" />;
}
