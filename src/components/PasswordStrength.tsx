import { useState, useEffect } from 'react';
import { checkPasswordStrength } from '@/lib/validation';
import { Progress } from '@/components/ui/progress';
interface PasswordStrengthProps { password: string; className?: string; }
const PasswordStrength = ({ password, className = '' }: PasswordStrengthProps) => {
  const [strength, setStrength] = useState({ score: 0, feedback: [] as string[], isStrong: false });
  useEffect(() => { if (password) setStrength(checkPasswordStrength(password)); else setStrength({ score: 0, feedback: [], isStrong: false }); }, [password]);
  if (!password) return null;
  const progressValue = Math.min((strength.score / 7) * 100, 100);
  const getStrengthText = (score: number) => { if (score >= 6) return 'Forte'; if (score >= 4) return 'Moderada'; if (score >= 2) return 'Fraca'; return 'Muito fraca'; };
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Força da senha:</span><span className={`text-sm font-medium ${strength.isStrong ? 'text-green-600' : 'text-orange-600'}`}>{getStrengthText(strength.score)}</span></div>
      <Progress value={progressValue} className="h-2" />
      {strength.feedback.length > 0 && <div className="space-y-1">{strength.feedback.map((f, i) => <p key={i} className="text-xs text-gray-500">• {f}</p>)}</div>}
    </div>
  );
};
export default PasswordStrength;