import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn: number = 3600
): { signedUrl: string | null; loading: boolean; error: Error | null } {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    const generateSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        let filePath = path;
        
        if (path.includes('/storage/v1/object/')) {
          const match = path.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
          if (match) {
            filePath = match[1];
          }
        }
        if (path.startsWith(`${bucket}/`)) {
          filePath = path.replace(`${bucket}/`, '');
        }

        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signError) throw signError;

        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        console.error('[useSignedUrl] Error generating signed URL:', err);
        setError(err instanceof Error ? err : new Error('Failed to generate signed URL'));
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [bucket, path, expiresIn]);

  return { signedUrl, loading, error };
}
