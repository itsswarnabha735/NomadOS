"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Save, MapPin, Link as LinkIcon, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [displayName, setDisplayName] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [website, setWebsite] = useState("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || "");
            setPhotoURL(userProfile.photoURL || "");
            setBio(userProfile.bio || "");
            setLocation(userProfile.location || "");
            setWebsite(userProfile.website || "");
        } else if (user) {
            setDisplayName(user.displayName || "");
            setPhotoURL(user.photoURL || "");
        }
    }, [user, userProfile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // 1. Update Auth Profile (Display Name & Photo only)
            if (user.displayName !== displayName || user.photoURL !== photoURL) {
                await updateProfile(user, {
                    displayName: displayName,
                    photoURL: photoURL || null
                });
            }

            // 2. Update Firestore Document (All fields)
            // Use setDoc with merge: true to create the document if it doesn't exist
            await setDoc(doc(db, "users", user.uid), {
                displayName: displayName,
                photoURL: photoURL || null,
                bio: bio,
                location: location,
                website: website
            }, { merge: true });

            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert(`Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold font-heading tracking-tight">NomadOS</span>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-heading text-slate-900">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your public profile and account preferences.</p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="grid gap-6">
                        {/* Avatar Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Picture</CardTitle>
                                <CardDescription>This will be displayed on your profile and shared trips.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center gap-6">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                                    <AvatarImage src={photoURL} />
                                    <AvatarFallback className="text-2xl bg-slate-100">
                                        {displayName?.charAt(0) || user.email?.charAt(0) || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="photoURL">Image URL</Label>
                                    <Input
                                        id="photoURL"
                                        placeholder="https://example.com/avatar.jpg"
                                        value={photoURL}
                                        onChange={(e) => setPhotoURL(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter a URL for your profile picture.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your personal details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="displayName">Display Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="displayName"
                                            className="pl-9"
                                            placeholder="Your Name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Textarea
                                        id="bio"
                                        placeholder="Tell us a little about yourself..."
                                        className="min-h-[100px]"
                                        value={bio}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="location">Location</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="location"
                                                className="pl-9"
                                                placeholder="City, Country"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="website">Website</Label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="website"
                                                className="pl-9"
                                                placeholder="https://yourwebsite.com"
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
