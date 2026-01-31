"use client";

import { createAuthClient } from "better-auth/react";
import { keystrokeLatencyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [keystrokeLatencyClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
