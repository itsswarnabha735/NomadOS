"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Map, Plane, Globe } from "lucide-react"
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError("Invalid email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
            {/* Left Side - Visual */}
            <div className="hidden lg:flex relative flex-col justify-between p-10 text-white bg-slate-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                </div>

                <div className="relative z-10 flex items-center gap-2">
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                        <Map className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">NomadOS</span>
                </div>

                <div className="relative z-10 max-w-md">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-medium leading-relaxed">
                            "The world is a book and those who do not travel read only one page."
                        </p>
                        <footer className="text-sm text-white/80">— Augustine of Hippo</footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email to sign in to your account
                        </p>
                    </div>
                    <div className="grid gap-6">
                        <form onSubmit={handleLogin}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                        {error}
                                    </div>
                                )}
                                <Button disabled={loading} className="w-full">
                                    {loading ? "Signing in..." : "Sign In with Email"}
                                </Button>
                            </div>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" disabled={loading}>
                                <Globe className="mr-2 h-4 w-4" />
                                Google
                            </Button>
                            <Button variant="outline" disabled={loading}>
                                <Plane className="mr-2 h-4 w-4" />
                                Github
                            </Button>
                        </div>

                        <p className="px-8 text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link
                                href="/signup"
                                className="underline underline-offset-4 hover:text-primary font-medium"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
