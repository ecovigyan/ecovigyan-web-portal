import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    // Credentials Provider - Email/Password Login
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDB();

        const trimmedInput = credentials.email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(trimmedInput.toLowerCase());

        // Find user by email or username
        let user;
        if (isEmail) {
          user = await User.findOne({ email: trimmedInput.toLowerCase() }).select("+password");
        } else {
          user = await User.findOne({ username: trimmedInput.toLowerCase() }).select("+password");
        }

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (user.isBanned) {
          throw new Error("Your account has been suspended. Please contact support.");
        }

        if (user.deletedAt) {
          throw new Error("This account has been deleted.");
        }

        if (!user.password) {
          throw new Error("Please sign in with Google");
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) {
          throw new Error("Invalid credentials");
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          points: user.points,
          dp: user.dp,
          authProvider: user.authProvider || "credentials",
          bio: user.bio,
        };
      },
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google sign-in
      if (account?.provider === "google") {
        await connectDB();

        // Check if user exists with this email
        let existingUser = await User.findOne({ email: user.email });

        if (existingUser) {
          // Check if banned or deleted
          if (existingUser.isBanned || existingUser.deletedAt) {
            return false;
          }
          // Update last login
          await User.findByIdAndUpdate(existingUser._id, { lastLogin: new Date() });
        } else {
          // Create new user from Google profile
          const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
          
          // Make username unique if needed
          let uniqueUsername = username;
          let counter = 1;
          while (await User.findOne({ username: uniqueUsername })) {
            uniqueUsername = `${username.slice(0, 17)}${counter}`;
            counter++;
          }

          existingUser = await User.create({
            name: user.name || "User",
            username: uniqueUsername,
            email: user.email.toLowerCase(),
            authProvider: "google",
            role: "user",
            points: 0,
            dp: {
              url: "",
              public_id: "",
            },
          });
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.points = user.points;
        token.dp = user.dp;
        token.authProvider = user.authProvider;
        token.bio = user.bio;
      }

      // For Google sign-in, fetch user data from database
      if (account?.provider === "google" && token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.points = dbUser.points;
          token.dp = dbUser.dp;
          token.authProvider = dbUser.authProvider;
          token.bio = dbUser.bio;
        }
      }

      // When session is updated (e.g., after profile update), fetch fresh data
      if (trigger === "update" && token.id) {
        await connectDB();
        const dbUser = await User.findById(token.id);
        if (dbUser) {
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.points = dbUser.points;
          token.dp = dbUser.dp;
          token.name = dbUser.name;
          token.authProvider = dbUser.authProvider;
          token.bio = dbUser.bio;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.points = token.points;
        session.user.dp = token.dp;
        session.user.authProvider = token.authProvider;
        session.user.bio = token.bio;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, send users to /explore instead of the home page.
      // This runs server-side, so it wins over any stale callbackUrl cookie.
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/explore`;
      }
      // Honour explicit relative paths (e.g. callbackUrl: "/explore")
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Honour same-origin absolute URLs
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/explore`;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
