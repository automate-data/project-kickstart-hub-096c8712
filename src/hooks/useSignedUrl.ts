import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn: number = 3600
): { signedUrl: string | null; loading: boolean; error: Error | null } {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const renewalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateSignedUrl = useCallback(async () => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let filePath = path;

      if (path.includes('/storage/v1/object/')) {
        const match = path.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(\?.*)?$/);
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

      // Schedule renewal 5 minutes before expiry
      if (renewalTimerRef.current) clearTimeout(renewalTimerRef.current);
      const renewIn = Math.max((expiresIn - 300) * 1000, 60000);
      renewalTimerRef.current = setTimeout(() => {
        generateSignedUrl();
      }, renewIn);
    } catch (err) {
      console.error('[useSignedUrl] Error generating signed URL:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate signed URL'));
      setSignedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [bucket, path, expiresIn]);

  useEffect(() => {
    generateSignedUrl();
    return () => {
      if (renewalTimerRef.current) clearTimeout(renewalTimerRef.current);
    };
  }, [generateSignedUrl]);

  return { signedUrl, loading, error };
}
