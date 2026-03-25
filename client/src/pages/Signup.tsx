// client/src/pages/Signup.tsx
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";

export default function Signup() {
  const [, navigate] = useLocation();
  const requestAccess = trpc.auth.requestAccess.useMutation({
    onSuccess: () => navigate("/login?pending=true"),
    onError: (err: unknown) => console.error(err),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    requestAccess.mutate({
      email: form.get("email") as string,
      password: form.get("password") as string,
      tenantName: form.get("tenantName") as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="tenantName" placeholder="Nome da Concessionária" required />
      <input name="email" type="email" required />
      <input name="password" type="password" minLength={6} required />
      <button type="submit" disabled={requestAccess.isPending}>
        Solicitar Acesso
      </button>
    </form>
  );
}