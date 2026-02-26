import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#040e17]">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#e8f4f8]" style={{ fontFamily: "var(--font-sora)" }}>
            <span style={{ color: "#2dd4bf" }}>FLOQ</span>
          </h1>
          <p className="text-[#a8ccd8] mt-1 text-sm">Outcome Flow Board</p>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#2dd4bf",
              colorBackground: "#061420",
              colorText: "#e8f4f8",
              colorInputBackground: "#0a1e2e",
              colorInputText: "#e8f4f8",
              borderRadius: "0.625rem",
            },
          }}
        />
      </div>
    </div>
  );
}
