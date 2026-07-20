import ChatPage from "@/views/ChatPage/ChatPage";

// The route stays a thin wrapper: it only renders the page component, keeping
// all layout and interaction concerns inside the atomic-design tree.
export default function Page() {
  return <ChatPage />;
}
