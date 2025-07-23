import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { motion } from "framer-motion";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { getSession, commitSession } from "~/services/session.server";

import { AUTH_URI } from "~/config/api";
import { verifyUser, loginWithCredentials } from "~/api/auth";

// --- Zod Schema for Validation ---
const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

// --- Remix Loader ---
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { isValid } = await verifyUser(request);
    if (isValid) {
      return redirect("/dashboard");
    }
  } catch (error) {
    console.error("User verification failed:", error);
  }
  
  return Response.json({ AUTH_URI });
}

// --- Remix Action ---
export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const { email, password } = Object.fromEntries(formData);

  const validationResult = loginSchema.safeParse({ email, password });

  if (!validationResult.success) {
    return Response.json({ errors: z.treeifyError(validationResult.error) }, { status: 400 });
  }

  try {
      const user = await loginWithCredentials(validationResult.data.email, validationResult.data.password, request);

    if (user.qboReAuthRequired) {
      return redirect(AUTH_URI);
    }

    session.set("userId", user.userId);

    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return Response.json({ errors: { _global: [message] } }, { status: 401 });
  }
}

// --- UI Components ---

const fadeIn = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const QuickBooksIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#2CA01C" />
    <path d="M15.3333 12.6667C15.3333 14.6667 13.82 16.2533 12 16.2533C10.18 16.2533 8.66669 14.6667 8.66669 12.6667C8.66669 12.4533 8.68002 12.2533 8.70669 12.0533H6.5V13.3333C6.5 15.84 8.50669 17.8333 11 17.8333H13C16.5933 17.8333 19.5 14.9267 19.5 11.3333V10H17.2933C16.18 10.58 15.3333 11.54 15.3333 12.6667ZM12 7.74667C13.82 7.74667 15.3333 9.33333 15.3333 11.3333C15.3333 11.5467 15.32 11.7467 15.2933 11.9467H17.5V10.6667C17.5 8.16 15.4933 6.16667 13 6.16667H11C7.40669 6.16667 4.5 9.07333 4.5 12.6667V14H6.70669C7.82 13.42 8.66669 12.46 8.66669 11.3333C8.66669 9.33333 10.18 7.74667 12 7.74667Z" fill="white" />
  </svg>
);

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const { AUTH_URI } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";

  const emailFieldErrors = actionData?.errors?.properties?.email;
  const passwordFieldErrors = actionData?.errors?.properties?.password;
  const globalErrors = actionData?.errors?._global;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
          <p className="text-gray-500 mt-2">Sign in to access your Smart Picker dashboard.</p>
        </div>

        <Form method="post" className="space-y-6">
          {globalErrors && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {globalErrors[0]}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required className={`h-12 px-4 ${emailFieldErrors ? 'border-red-500' : ''}`} />
            {emailFieldErrors && <p className="text-red-500 text-sm mt-1">{emailFieldErrors.errors[0]}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {/* <Link to="/forgot-password" className="text-sm font-medium text-[#4285F4] hover:underline">Forgot?</Link> */}
            </div>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? "text" : "password"} 
                required 
                className={`h-12 px-4 pr-10 ${passwordFieldErrors ? 'border-red-500' : ''}`} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordFieldErrors && <p className="text-red-500 text-sm mt-1">{passwordFieldErrors.errors[0]}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-full text-lg bg-[#4285F4] hover:bg-blue-600 text-white flex items-center justify-center">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or continue with</span></div>
        </div>

        <div>
          <a href={AUTH_URI}>
            <Button variant="outline" className="w-full h-12 rounded-full text-lg border-gray-300 hover:bg-gray-100">
              <QuickBooksIcon />
              Sign in with QuickBooks
            </Button>
          </a>
        </div>
        
        {/* <p className="text-center text-sm text-gray-500 pt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-[#4285F4] hover:underline">Sign Up</Link>
        </p> */}
      </motion.div>
    </div>
  );
}
