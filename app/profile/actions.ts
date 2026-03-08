"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface ProfileFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
  const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
  const username = (formData.get("username") as string | null)?.trim() ?? "";

  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  if (!firstName) fieldErrors.first_name = "First name is required.";
  if (!lastName) fieldErrors.last_name = "Last name is required.";
  if (!username) {
    fieldErrors.username = "Username is required.";
  } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    fieldErrors.username =
      "Username must be 3–30 characters and can only contain letters, numbers, and underscores.";
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
    return { error: "You must be logged in to update your profile." };
  }

  const { error: upsertError } = await supabase.from("user_info").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    username,
  });

  if (upsertError) {
    if (upsertError.code === "23505") {
      return { fieldErrors: { username: "That username is already taken." } };
    }
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true };
}
