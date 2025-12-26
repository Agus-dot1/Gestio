import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MessageCircle, Phone } from 'lucide-react';
import { openWhatsApp } from '@/lib/installments/installment-helpers';

interface WhatsAppButtonProps {
    customer: any;
    onClick?: (e: React.MouseEvent) => void;
}

export function WhatsAppButton({ customer, onClick }: WhatsAppButtonProps) {
    const handlePrimaryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openWhatsApp(customer, customer.phone!);
        onClick?.(e);
    };

    const handleSecondaryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openWhatsApp(customer, customer.secondary_phone!, true);
    };

    return (
        <HoverCard openDelay={1000} closeDelay={100}>
            <HoverCardTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 w-10 p-0"
                    onClick={handlePrimaryClick}
                >
                    <MessageCircle className="h-5 w-5" />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-[240px] p-2">
                <div className="flex text-sm flex-col gap-2">
                    Segundo contacto:
                    {customer.secondary_phone && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="justify-start"
                            onClick={handleSecondaryClick}
                            title="WhatsApp (secundario)"
                        >
                            <Phone className="h-3 w-3 mr-2" />
                            {customer.secondary_phone}
                        </Button>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}