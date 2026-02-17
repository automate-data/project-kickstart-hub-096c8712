import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
interface BackToDashboardButtonProps { className?: string; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "icon"; }
export const BackToDashboardButton = ({ className = "", variant = "ghost", size = "sm" }: BackToDashboardButtonProps) => {
  const navigate = useNavigate();
  return <Button variant={variant} size={size} onClick={() => navigate("/dashboard")} className={className}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>;
};