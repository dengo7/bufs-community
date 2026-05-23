import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase/server';
import WriteForm from './WriteForm';

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const params = await searchParams;

  return <WriteForm initialCategory={params.category} userId={user.id} />;
}
