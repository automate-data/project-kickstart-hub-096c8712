import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSignedUrl(
  bucket: string,
  path: string | null | undefined,
  _expiresIn: number = 3600
): { signedUrl: string | null; loading: boolean; error: Error | null } {
  const signedUrl = useMemo(() => {
    if (!path) return null;

    let filePath = path;

    // Extract filename from full storage URLs
    if (path.includes('/storage/v1/object/')) {
      const match = path.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(\?.*)?$/);
      if (match) {
        filePath = match[1];
      }
    }
    if (filePath.startsWith(`${bucket}/`)) {
      filePath = filePath.replace(`${bucket}/`, '');
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || null;
  }, [bucket, path]);

  return { signedUrl, loading: false, error: null };
}
