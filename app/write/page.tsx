import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase/server';
import WriteForm from './WriteForm';

export default async function WritePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  return <WriteForm userId={user.id} />;
}
