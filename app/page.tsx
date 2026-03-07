import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "./_components/logout-button";

const randomPhrases = [
  "gerbils on a Tuesday",
  "the fog remembers nothing",
  "seventeen invisible pigeons",
  "a brief history of toast",
  "noodles of uncertain origin",
];

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const hello_world =
    randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

  const { error: insertError } = await supabase
    .from("test_db_table")
    .insert({ hello_world });

  if (insertError) {
    console.error("Insert error:", insertError);
  }

  const { data: rows, error: selectError } = await supabase
    .from("test_db_table")
    .select("*");

  if (selectError) {
    console.error("Select error:", selectError);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col gap-12 py-32 px-16 bg-white dark:bg-black">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            test_db_table
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>

        {selectError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            <p className="font-medium">Error fetching rows</p>
            <pre className="mt-2 text-sm">
              {JSON.stringify(selectError, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows && rows.length > 0 ? (
              rows.map((row, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <pre>{JSON.stringify(row, null, 2)}</pre>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No rows found.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
