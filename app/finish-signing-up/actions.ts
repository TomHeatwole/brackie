"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface ProfileFormState {
  error?: string;
  fieldErrors?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

export async function finishSigningUp(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
  const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
  const username = (formData.get("username") as string | null)?.trim() ?? "";
  const avatarUrl = (formData.get("avatar_url") as string | null)?.trim() ?? "";

  const fieldErrors: ProfileFormState["fieldErrors"] = {};

  if (!firstName) {
    fieldErrors.first_name = "First name is required.";
  } else if (firstName.length > 50) {
    fieldErrors.first_name = "First name must be 50 characters or fewer.";
  }

  if (!lastName) {
    fieldErrors.last_name = "Last name is required.";
  } else if (lastName.length > 50) {
    fieldErrors.last_name = "Last name must be 50 characters or fewer.";
  }

  if (!username) {
    fieldErrors.username = "Username is required.";
  } else if (username.length < 3) {
    fieldErrors.username = "Username must be at least 3 characters.";
  } else if (username.length > 30) {
    fieldErrors.username = "Username must be 30 characters or fewer.";
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    fieldErrors.username =
      "Username can only contain letters, numbers, and underscores.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in to complete this step." };
  }

  const { data: existing } = await supabase
    .from("user_info")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { fieldErrors: { username: "That username is already taken." } };
  }

  const { error: upsertError } = await supabase.from("user_info").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    username,
    avatar_url: avatarUrl || null,
  });

  if (upsertError) {
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  redirect("/");
}
