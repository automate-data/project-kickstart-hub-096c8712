import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

interface PackagePhotoProps {
  photoUrl: string | null | undefined;
  alt?: string;
  className?: string;
}

export function PackagePhoto({ photoUrl, alt = 'Encomenda', className = '' }: PackagePhotoProps) {
  const { signedUrl, loading, error } = useSignedUrl('package-photos', photoUrl);

  if (loading) {
    return <Skeleton className={`${className} animate-pulse`} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <Package className="w-1/3 h-1/3 text-muted-foreground" />
      </div>
    );
  }

  return <img src={signedUrl} alt={alt} className={className} />;
}
