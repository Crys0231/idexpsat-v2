import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * ============================================================================
 * SUPABASE AUTH HOOK
 * ============================================================================
 *
 * Hook para gerenciar autenticação com Supabase
 */

interface AuthState {
    user: User | null;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
}

export function useSupabaseAuth(redirectOnUnauthenticated = false) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
        error: null,
        isAuthenticated: false,
    });

    const [, navigate] = useLocation();

    useEffect(() => {
        // Verificar sessão atual
        const checkAuth = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (session?.user) {
                    setAuthState({
                        user: session.user,
                        loading: false,
                        error: null,
                        isAuthenticated: true,
                    });
                } else {
                    setAuthState({
                        user: null,
                        loading: false,
                        error: null,
                        isAuthenticated: false,
                    });

                    if (redirectOnUnauthenticated) {
                        navigate("/login", { replace: true });
                    }
                }
            } catch (error) {
                setAuthState({
                    user: null,
                    loading: false,
                    error: error instanceof Error ? error : new Error("Auth check failed"),
                    isAuthenticated: false,
                });
            }
        };

        checkAuth();

        // Escutar mudanças de autenticação
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setAuthState({
                    user: session.user,
                    loading: false,
                    error: null,
                    isAuthenticated: true,
                });
            } else {
                setAuthState({
                    user: null,
                    loading: false,
                    error: null,
                    isAuthenticated: false,
                });

                if (redirectOnUnauthenticated) {
                    navigate("/login", { replace: true });
                }
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [redirectOnUnauthenticated, navigate]);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setAuthState({
                user: null,
                loading: false,
                error: null,
                isAuthenticated: false,
            });
            navigate("/login", { replace: true });
        } catch (error) {
            setAuthState((prev) => ({
                ...prev,
                error: error instanceof Error ? error : new Error("Logout failed"),
            }));
        }
    };

    return {
        ...authState,
        logout,
    };
}
