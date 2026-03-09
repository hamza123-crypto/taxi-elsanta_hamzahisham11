import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md h-20 flex justify-between items-center border-b border-blue-200 shadow-lg px-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce">🛺</div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              توك توك السنطة
            </h2>
            <p className="text-sm text-gray-600">منصة النقل المحلية</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://wa.me/201009500662" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            <span className="text-xl">📱</span>
            <span className="font-bold">01009500662</span>
          </a>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}

function Content() {
  const currentUser = useQuery(api.users.getCurrentUser);

  if (currentUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>

      <Authenticated>
        {!currentUser?.profile ? (
          <ProfileSetup />
        ) : (
          <Dashboard user={currentUser} />
        )}
      </Authenticated>
    </div>
  );
}
