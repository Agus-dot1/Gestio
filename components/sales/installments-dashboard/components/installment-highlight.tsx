import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { useInstallmentUIStore, selectHighlight } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';

export function HighlightBanner() {
    const {
        stickyHighlight,
        autoScrollEnabled,
        clearHighlight,
        setAutoScrollEnabled,
    } = useInstallmentUIStore(useShallow(selectHighlight));

    if (!stickyHighlight) return null;

    return (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Search className="h-4 w-4" />
                <span>Elemento resaltado (ID: {stickyHighlight})</span>
            </div>
            <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2 px-3 border-r border-primary/20">
                    <Switch
                        id="auto-scroll-installments"
                        checked={autoScrollEnabled}
                        onCheckedChange={setAutoScrollEnabled}
                    />
                    <Label
                        htmlFor="auto-scroll-installments"
                        className="text-[10px] uppercase font-bold tracking-wider opacity-70 cursor-pointer whitespace-nowrap"
                    >
                        Auto-scroll
                    </Label>
                </div>
                <Button size="sm" variant="ghost" onClick={clearHighlight} className="h-8">
                    Quitar resalte
                </Button>
            </div>
        </div>
    );
}