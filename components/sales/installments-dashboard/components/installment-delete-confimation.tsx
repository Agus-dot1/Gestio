import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInstallmentUIStore } from '@/context/stores/installment-ui-store';
import { selectDialogs } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';

interface DeleteConfirmationDialogsProps {
    onConfirmDeleteCustomer: (customer: any) => void;
    onConfirmDeleteSale: (sale: any) => void;
}

export function DeleteConfirmationDialogs({
    onConfirmDeleteCustomer,
    onConfirmDeleteSale,
}: DeleteConfirmationDialogsProps) {
    const { deleteCustomer, deleteSale, setDeleteCustomer, setDeleteSale } =
        useInstallmentUIStore(useShallow(selectDialogs));

    return (
        <>
            {/* Delete Customer Dialog */}
            <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar al cliente &quot;{deleteCustomer?.name}&quot; y
                            todas sus ventas e instalments?
                        </AlertDialogDescription>
                        <div className="mt-2">
                            <p className="text-sm text-muted-foreground mb-2">Esta acción eliminará:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>{deleteCustomer?.sales.length} venta(s)</li>
                                <li>{deleteCustomer?.installments.length} cuota(s)</li>
                            </ul>
                        </div>
                        <AlertDialogDescription className="sr-only">
                            Confirmación de eliminación de cliente Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => onConfirmDeleteCustomer(deleteCustomer)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Cliente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Sale Dialog */}
            <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Venta</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar la{' '}
                            {deleteSale?.reference_code
                                ? `venta con referencia ${deleteSale.reference_code}`
                                : `venta #${deleteSale?.sale_number}`}
                            ? Se eliminarán sus cuotas asociadas. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => onConfirmDeleteSale(deleteSale)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Venta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}