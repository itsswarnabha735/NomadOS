"use client";

import { AuthProvider } from "@/components/auth-provider";
import { useEffect, useState } from "react";

export default function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>{children}</>;
        // Or return null if you want to block rendering until client. 
        // But returning children allows static parts to render.
        // However, if children depend on AuthContext, they might fail if we don't provide it.
        // But AuthProvider provides default values (user: null, loading: true).
    }

    return <AuthProvider>{children}</AuthProvider>;
}
