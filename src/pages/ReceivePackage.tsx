import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCondominium } from '@/hooks/useCondominium';
import { Resident, AISuggestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, ArrowLeft, Check, Sparkles, Search, X, Upload } from 'lucide-react';
import { processImageForWhatsApp } from '@/lib/imageProcessor';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Step = 'capture' | 'processing' | 'confirm';

export default function ReceivePackage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { condominium } = useCondominium();
  const groupLabel = condominium?.group_label || 'Bloco';
  const unitLabel = condominium?.unit_label || 'Apartamento';
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('capture');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [residentSearchOpen, setResidentSearchOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchResidents = useCallback(async (): Promise<Resident[]> => {
    if (!condominium?.id) {
      setResidents([]);
      return [];
    }

    const { data } = await supabase
      .from('residents')
      .select('*')
      .eq('is_active', true)
      .eq('condominium_id', condominium.id)
      .order('full_name');
    
    if (data) {
      const residentsData = data as Resident[];
      setResidents(residentsData);
      return residentsData;
    }
    return [];
  }, [condominium?.id]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error('[Camera] getUserMedia failed:', err);
      fileInputRef.current?.click();
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoFile(file);
      const preview = URL.createObjectURL(blob);
      setPhotoPreview(preview);
      const residentsData = await fetchResidents();
      await processWithAI(file, residentsData);
    }, 'image/jpeg', 0.9);
  }, [stopCamera, fetchResidents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    
    const residentsData = await fetchResidents();
    await processWithAI(file, residentsData);
  };

  const processWithAI = async (file: File, residentsData: Resident[]) => {
    setStep('processing');
    setIsProcessing(true);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('process-label', {
        body: { image_base64: base64 },
      });

      if (error) throw error;

      if (data?.suggestion) {
        const suggestion = data.suggestion;
        setAiSuggestion(suggestion);
        setOcrRawText(data.raw_text || null);

        // Auto-select resident matching logic
        const normalizeText = (str: string) => 
          str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
        
        const normalizeBlock = (block: string): string => {
          if (!block) return '';
          const cleaned = block.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const match = cleaned.match(/^([A-Z])/);
          return match ? match[1] : cleaned;
        };
        
        const normalizeApartment = (apt: string): string => {
          if (!apt) return '';
          const numbers = String(apt).replace(/\D/g, '');
          return numbers.replace(/^0+(?=\d)/, '') || numbers;
        };
        
        const suggestedName = normalizeText(suggestion.resident_name || '');
        const suggestedBlock = normalizeBlock(suggestion.block || '');
        const suggestedApartment = normalizeApartment(suggestion.apartment || '');
        
        let bestMatch: Resident | null = null;
        let bestScore = 0;
        
        for (const resident of residentsData) {
          let score = 0;
          const residentBlock = normalizeBlock(resident.block);
          const residentApartment = normalizeApartment(resident.apartment);
          const residentName = normalizeText(resident.full_name);
          
          if (suggestedApartment && residentApartment && residentApartment === suggestedApartment) score += 40;
          if (suggestedBlock && residentBlock && residentBlock === suggestedBlock) score += 30;
          
          if (suggestedName && residentName) {
            const stopWords = ['de', 'da', 'do', 'dos', 'das', 'e'];
            const suggestedWords = suggestedName.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
            const residentWords = residentName.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
            const matchingWords = suggestedWords.filter(sw => residentWords.some(rw => rw.includes(sw) || sw.includes(rw)));
            if (matchingWords.length >= 2) score += 35;
            else if (matchingWords.length === 1) score += 20;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = resident;
          }
        }
        
        if (bestScore >= 35 && bestMatch) setSelectedResident(bestMatch);
        if (suggestion.carrier) setCarrier(suggestion.carrier);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: 'Não foi possível ler a etiqueta',
        description: 'Selecione o morador manualmente',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    if (!photoFile || !user) return;
    setIsSaving(true);

    try {
      const processedImage = await processImageForWhatsApp(photoFile);

      const { error: uploadError } = await supabase.storage
        .from('package-photos')
        .upload(processedImage.fileName, processedImage.blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const photoPath = processedImage.fileName;

      const { error: insertError } = await supabase
        .from('packages')
        .insert([{
          resident_id: selectedResident?.id || null,
          photo_url: photoPath,
          carrier: carrier || null,
          ocr_raw_text: ocrRawText,
          ai_suggestion: aiSuggestion as any,
          notes: notes || null,
          received_by: user.id,
          condominium_id: condominium?.id || null,
        }]);

      if (insertError) throw insertError;

      if (selectedResident?.phone) {
        try {
          const registeredBy = user?.user_metadata?.full_name || 'Portaria';
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              phone: selectedResident.phone,
              residentName: selectedResident.full_name,
              registeredBy: registeredBy,
              photoFilename: processedImage.fileName,
            },
          });
        } catch (notifError) {
          console.error('WhatsApp notification error:', notifError);
        }
      }

      toast({
        title: 'Encomenda registrada!',
        description: selectedResident?.phone 
          ? 'Morador notificado via WhatsApp' 
          : 'Morador não tem telefone cadastrado',
      });

      navigate('/');
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && streamRef.current) {
                el.srcObject = streamRef.current;
              }
            }}
            onLoadedMetadata={(e) => {
              (e.target as HTMLVideoElement).play();
            }}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full object-cover"
          />
          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/30 active:bg-white/60 transition-colors"
              aria-label="Capturar foto"
            />
          </div>
        </div>
      )}

      {step === 'capture' && !isCameraOpen && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
          <Button onClick={() => navigate('/')} variant="ghost" className="absolute top-4 left-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>

          <div
            onClick={openCamera}
            className="w-64 h-64 border-2 border-dashed border-primary/50 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
          >
            <Camera className="w-16 h-16 text-primary" />
            <span className="text-lg font-medium text-center px-4">
              Toque para fotografar a etiqueta
            </span>
          </div>

          <div className="flex items-center gap-3 w-64">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-12"
          >
            <Upload className="w-5 h-5 mr-2" />
            Selecionar do computador
          </Button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-lg font-medium">Lendo etiqueta...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Identificando destinatário automaticamente
            </p>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6 pb-24">
          <Button
            onClick={() => {
              setStep('capture');
              setPhotoFile(null);
              setPhotoPreview(null);
              setSelectedResident(null);
              setCarrier('');
              setNotes('');
              setAiSuggestion(null);
            }}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nova foto
          </Button>

          <Card>
            <CardContent className="p-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={photoPreview!} alt="Encomenda" className="w-full h-full object-contain" />
              </div>
            </CardContent>
          </Card>

          {aiSuggestion && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-lg">
              <Sparkles className="w-4 h-4" />
              <span>Dados sugeridos pela IA</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Morador</Label>
            <Popover open={residentSearchOpen} onOpenChange={setResidentSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between h-12 text-left font-normal">
                  {selectedResident ? (
                    <span>{selectedResident.full_name} - {groupLabel} {selectedResident.block}/{unitLabel} {selectedResident.apartment}</span>
                  ) : (
                    <span className="text-muted-foreground">Selecionar morador...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar morador..." />
                  <CommandList>
                    <CommandEmpty>Nenhum morador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {residents.map((resident) => (
                        <CommandItem
                          key={resident.id}
                          onSelect={() => {
                            setSelectedResident(resident);
                            setResidentSearchOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span>{resident.full_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {groupLabel} {resident.block} / {unitLabel} {resident.apartment}
                            </span>
                          </div>
                          {selectedResident?.id === resident.id && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carrier">Transportadora (opcional)</Label>
            <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ex: Correios, Jadlog..." className="h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." rows={3} />
          </div>

          <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent md:relative md:bottom-auto md:p-0 md:bg-transparent">
            <Button onClick={handleSubmit} className="w-full h-14 text-lg" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirmar recebimento
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
